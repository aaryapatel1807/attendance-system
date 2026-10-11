"""
Face Recognition Attendance System — AI service (FastAPI).

- Face detection + embeddings: InsightFace `buffalo_l` bundle (pretrained),
  SCRFD-10G face detector + ArcFace R100 recognition model (512-d embeddings).
- Matching: cosine similarity on L2-normalized embeddings,
  match iff similarity >= MATCH_THRESHOLD.
- Registered embeddings are persisted in local SQLite (encodings.db).

Contract: GET /health, POST /detect, POST /register-face, POST /recognize.
All POST endpoints require header `X-AI-Key` == env AI_SERVICE_KEY
(default "dev-key-change-me"); wrong/missing key -> 401.

Models are lazy-loaded in the startup event (~300MB download on first boot).
If loading fails, the process never crashes: /health reports "degraded"
and POST endpoints return 503.
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

APP_VERSION = "2.0.0"
MATCH_THRESHOLD = 0.55
EMBEDDING_DIM = 512
MIN_DET_SCORE = 0.5

AI_SERVICE_KEY = os.environ.get("AI_SERVICE_KEY", "dev-key-change-me")
DB_PATH = os.environ.get(
    "ENCODINGS_DB", os.path.join(os.path.dirname(os.path.abspath(__file__)), "encodings.db")
)

# ---------------------------------------------------------------- state ----
_models_ready = False
_load_error = None
_face_app = None  # InsightFace FaceAnalysis instance
_fa_lock = threading.Lock()

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
@app.on_event("startup")
def load_models():
    global _face_app, _models_ready, _load_error
    try:
        from insightface.app import FaceAnalysis

        # buffalo_l = SCRFD-10G detector + ArcFace R100 (pretrained).
        # Models auto-download (~300MB) on first prepare().
        _face_app = FaceAnalysis(
            name="buffalo_l",
            root=os.path.join(os.path.expanduser("~"), ".insightface"),
        )
        _face_app.prepare(ctx_id=-1, det_size=(640, 640))  # CPU
    except Exception as e:  # never crash the process
        _face_app = None
        _load_error = f"InsightFace failed to load: {e}"
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
    """Strip base64 data-URL prefix, decode to BGR numpy array (InsightFace format)."""
    payload = data_url
    if data_url.startswith("data:") and "," in data_url:
        payload = data_url.split(",", 1)[1]
    try:
        raw = base64.b64decode(payload, validate=True)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid image data: {e}")
    rgb = np.asarray(img)
    return rgb[:, :, ::-1].copy()  # RGB -> BGR, contiguous


def analyze(img_bgr: np.ndarray) -> list:
    """Run detection+embedding. Returns [{'bbox':[x,y,w,h], 'confidence':f,
    'embedding': np.ndarray(512)}] with bboxes in pixels relative to input."""
    with _fa_lock:  # FaceAnalysis is not documented as thread-safe
        faces = _face_app.get(np.ascontiguousarray(img_bgr))
    h, w = img_bgr.shape[:2]
    out = []
    for f in faces:
        score = float(getattr(f, "det_score", 0.0) or 0.0)
        if score < MIN_DET_SCORE:
            continue
        x1, y1, x2, y2 = (int(v) for v in f.bbox)
        x1 = max(0, min(x1, w - 1))
        y1 = max(0, min(y1, h - 1))
        x2 = max(0, min(x2, w))
        y2 = max(0, min(y2, h))
        emb = np.asarray(f.normed_embedding, dtype=np.float32)
        if emb.size != EMBEDDING_DIM:
            continue
        out.append({
            "bbox": [x1, y1, max(0, x2 - x1), max(0, y2 - y1)],
            "confidence": round(score, 4),
            "embedding": emb,
        })
    return out


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    # Embeddings are L2-normalized -> cosine similarity is the dot product.
    return float(np.dot(a, b))


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
            # Re-normalize defensively (stored mean may drift from unit norm).
            n = float(np.linalg.norm(emb))
            out.append((sid, emb / n if n > 0 else emb))
    return out


# ------------------------------------------------------------ routes -------
@app.get("/health")
def health():
    return {
        "status": "ok" if _models_ready else "degraded",
        "model": "insightface-buffalo_l(arcface)",
        "version": APP_VERSION,
    }


@app.post("/detect")
def detect(req: DetectRequest, x_ai_key: str | None = Header(default=None, alias="X-AI-Key")):
    ensure_ready_and_authorized(x_ai_key)
    img = decode_data_url(req.image)
    faces = analyze(img)
    return {"faces": [{"bbox": f["bbox"], "confidence": f["confidence"]} for f in faces]}


@app.post("/register-face")
def register_face(req: RegisterRequest,
                  x_ai_key: str | None = Header(default=None, alias="X-AI-Key")):
    ensure_ready_and_authorized(x_ai_key)
    if not req.student_id:
        raise HTTPException(status_code=422, detail="student_id is required")
    if not isinstance(req.images, list) or not (1 <= len(req.images) <= 50):
        raise HTTPException(status_code=422, detail="images must be a list of 1-50 data-URLs")

    embeddings = []
    faces_found = 0
    for data_url in req.images:
        img = decode_data_url(data_url)
        faces = analyze(img)
        if not faces:
            continue  # skip images with no face
        faces_found += 1
        largest = max(faces, key=lambda f: f["bbox"][2] * f["bbox"][3])
        embeddings.append(largest["embedding"])

    if not embeddings:
        raise HTTPException(status_code=422, detail="No faces detected in any of the provided images")

    mean_emb = np.mean(np.stack(embeddings), axis=0).astype(np.float32)
    n = float(np.linalg.norm(mean_emb))
    if n > 0:
        mean_emb = mean_emb / n
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
    faces = analyze(img)
    stored = load_all_embeddings()

    matches, unknown = [], []
    for face in faces:
        emb = face["embedding"]
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
