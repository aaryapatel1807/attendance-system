"""
Face Recognition Attendance System — AI service (FastAPI).

- Face detection: MediaPipe Face Detection (short-range model, blaze_face_short_range),
  pretrained, via the tasks-vision API.
- Face embeddings: DeepFace `Facenet512` (pretrained), enforce_detection=False
  because faces are already cropped with MediaPipe.
- Matching: cosine similarity, match iff similarity >= 0.55.
- Registered embeddings are persisted in local SQLite (encodings.db).

Contract: GET /health, POST /detect, POST /register-face, POST /recognize.
All POST endpoints require header `X-AI-Key` == env AI_SERVICE_KEY
(default "dev-key-change-me"); wrong/missing key -> 401.

Models are lazy-loaded in the startup event. If loading fails, the process
never crashes: /health reports "degraded" and POST endpoints return 503.
"""

import base64
import io
import os
import sqlite3
import threading
from datetime import datetime, timezone

import numpy as np
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image

APP_VERSION = "1.0.0"
MATCH_THRESHOLD = 0.55
EMBEDDING_DIM = 512

AI_SERVICE_KEY = os.environ.get("AI_SERVICE_KEY", "dev-key-change-me")
DB_PATH = os.environ.get(
    "ENCODINGS_DB", os.path.join(os.path.dirname(os.path.abspath(__file__)), "encodings.db")
)

# ---------------------------------------------------------------- state ----
_models_ready = False
_load_error = None
_face_detector = None  # MediaPipe FaceDetection instance
_DeepFace = None       # DeepFace module (models downloaded on build_model)
_mp_lock = threading.Lock()

# ---------------------------------------------------------------- app ------
app = FastAPI(title="face-attendance-ai", version=APP_VERSION)


# ------------------------------------------------------------ errors -------
@app.exception_handler(HTTPException)
async def http_error_handler(_: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    msgs = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())
    return JSONResponse(status_code=422, content={"error": msgs})


# ------------------------------------------------------------ models -------
class DetectRequest(BaseModel):
    image: str


class RegisterRequest(BaseModel):
    student_id: str
    images: list


class RecognizeRequest(BaseModel):
    image: str


# ------------------------------------------------------------ startup ------
MP_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_detector/"
    "blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
)
MP_MODEL_PATH = os.environ.get(
    "MP_FACE_MODEL",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "models",
                 "blaze_face_short_range.tflite"),
)


def download_mp_model(path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    import urllib.request

    req = urllib.request.Request(MP_MODEL_URL, headers={"User-Agent": "face-attendance-ai/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp, open(path, "wb") as f:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)


@app.on_event("startup")
def load_models():
    global _face_detector, _DeepFace, _models_ready, _load_error
    try:
        # Tasks API (mediapipe >= 0.10.9 dropped the legacy solutions API);
        # still the pretrained MediaPipe short-range face detection model.
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision

        if not os.path.exists(MP_MODEL_PATH):
            download_mp_model(MP_MODEL_PATH)
        base = mp_python.BaseOptions(model_asset_path=MP_MODEL_PATH)
        options = vision.FaceDetectorOptions(
            base_options=base,
            running_mode=vision.RunningMode.IMAGE,
            min_detection_confidence=0.5,
        )
        _face_detector = vision.FaceDetector.create_from_options(options)
    except Exception as e:  # never crash the process
        _load_error = f"MediaPipe face detection failed to load: {e}"
        return
    try:
        from deepface import DeepFace as _DF

        _DeepFace = _DF
        # Downloads Facenet512 weights on first run (~90MB).
        _DeepFace.build_model("Facenet512")
    except Exception as e:
        _face_detector = None
        _load_error = f"DeepFace Facenet512 failed to load: {e}"
        return
    _models_ready = True


def ensure_ready_and_authorized(x_ai_key):
    if not _models_ready:
        raise HTTPException(
            status_code=503,
            detail=f"AI models unavailable: {_load_error or 'still loading'}",
        )
    if x_ai_key != AI_SERVICE_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-AI-Key")


# ------------------------------------------------------------ helpers ------
def decode_data_url(data_url: str) -> np.ndarray:
    """Strip base64 data-URL prefix, decode to RGB numpy array."""
    payload = data_url
    if data_url.startswith("data:") and "," in data_url:
        payload = data_url.split(",", 1)[1]
    try:
        raw = base64.b64decode(payload, validate=True)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid image data: {e}")
    return np.asarray(img)


def detect_faces(img_rgb: np.ndarray) -> list:
    """Return [{'bbox': [x,y,w,h] (px, relative to input), 'confidence': f}]."""
    import mediapipe as mp

    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img_rgb))
    with _mp_lock:  # FaceDetector is not documented as thread-safe
        result = _face_detector.detect(mp_image)
    faces = []
    h, w = img_rgb.shape[:2]
    for d in result.detections:
        bb = d.bounding_box
        x = max(0, int(bb.origin_x))
        y = max(0, int(bb.origin_y))
        bw = max(0, int(bb.width))
        bh = max(0, int(bb.height))
        x = min(x, w - 1)
        y = min(y, h - 1)
        bw = min(bw, w - x)
        bh = min(bh, h - y)
        score = float(d.categories[0].score) if d.categories else 0.0
        faces.append({"bbox": [x, y, bw, bh], "confidence": round(score, 4)})
    return faces


def crop_face(img_rgb: np.ndarray, bbox: list, pad: float = 0.25) -> np.ndarray:
    x, y, w, h = bbox
    H, W = img_rgb.shape[:2]
    x1 = max(0, int(x - w * pad))
    y1 = max(0, int(y - h * pad))
    x2 = min(W, int(x + w * (1 + pad)))
    y2 = min(H, int(y + h * (1 + pad)))
    return img_rgb[y1:y2, x1:x2]


def embed_crop(crop_rgb: np.ndarray) -> np.ndarray:
    if crop_rgb.size == 0:
        raise HTTPException(status_code=422, detail="Face crop is empty")
    # detector_backend="skip": faces are already cropped with MediaPipe, so
    # DeepFace must not run (or download) its own face detector.
    reps = _DeepFace.represent(img_path=crop_rgb, model_name="Facenet512",
                               enforce_detection=False, detector_backend="skip")
    return np.asarray(reps[0]["embedding"], dtype=np.float32)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS embeddings ("
        "student_id TEXT PRIMARY KEY, embedding BLOB, dim INT, updated_at TEXT)"
    )
    return conn


def load_all_embeddings() -> list:
    conn = get_db()
    rows = conn.execute("SELECT student_id, embedding, dim FROM embeddings").fetchall()
    conn.close()
    out = []
    for sid, blob, dim in rows:
        emb = np.frombuffer(blob, dtype=np.float32)
        if emb.size == dim:
            out.append((sid, emb))
    return out


# ------------------------------------------------------------ routes -------
@app.get("/health")
def health():
    return {
        "status": "ok" if _models_ready else "degraded",
        "model": "mediapipe+facenet",
        "version": APP_VERSION,
    }


@app.post("/detect")
def detect(req: DetectRequest, x_ai_key: str | None = Header(default=None, alias="X-AI-Key")):
    ensure_ready_and_authorized(x_ai_key)
    img = decode_data_url(req.image)
    return {"faces": detect_faces(img)}


@app.post("/register-face")
def register_face(req: RegisterRequest,
                  x_ai_key: str | None = Header(default=None, alias="X-AI-Key")):
    ensure_ready_and_authorized(x_ai_key)
    if not req.student_id:
        raise HTTPException(status_code=422, detail="student_id is required")
    if not isinstance(req.images, list) or not (1 <= len(req.images) <= 5):
        raise HTTPException(status_code=422, detail="images must be a list of 1-5 data-URLs")

    embeddings = []
    faces_found = 0
    for data_url in req.images:
        img = decode_data_url(data_url)
        faces = detect_faces(img)
        if not faces:
            continue  # skip images with no face
        faces_found += 1
        largest = max(faces, key=lambda f: f["bbox"][2] * f["bbox"][3])
        embeddings.append(embed_crop(crop_face(img, largest["bbox"])))

    if not embeddings:
        raise HTTPException(status_code=422, detail="No faces detected in any of the provided images")

    mean_emb = np.mean(np.stack(embeddings), axis=0).astype(np.float32)
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO embeddings (student_id, embedding, dim, updated_at)"
        " VALUES (?, ?, ?, ?)",
        (req.student_id, mean_emb.tobytes(), int(mean_emb.size),
         datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    conn.close()
    return {"success": True, "faces_found": faces_found, "embedding_dim": int(mean_emb.size)}


@app.post("/recognize")
def recognize(req: RecognizeRequest,
              x_ai_key: str | None = Header(default=None, alias="X-AI-Key")):
    ensure_ready_and_authorized(x_ai_key)
    img = decode_data_url(req.image)
    faces = detect_faces(img)
    stored = load_all_embeddings()

    matches, unknown = [], []
    for face in faces:
        emb = embed_crop(crop_face(img, face["bbox"]))
        best_sid, best_sim = None, -1.0
        for sid, ref in stored:
            sim = cosine_similarity(emb, ref)
            if sim > best_sim:
                best_sid, best_sim = sid, sim
        if best_sid is not None and best_sim >= MATCH_THRESHOLD:
            matches.append({
                "student_id": best_sid,
                "confidence": round(best_sim, 4),
                "bbox": face["bbox"],
            })
        else:
            unknown.append({"bbox": face["bbox"]})

    matches.sort(key=lambda m: m["confidence"], reverse=True)
    return {"matches": matches, "unknown": unknown}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
