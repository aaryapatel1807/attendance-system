# face-attendance-ai — AI service (FastAPI)

Face detection (MediaPipe, short-range) + face embeddings (DeepFace `Facenet512`, pretrained).
No custom training. Registered embeddings are stored in local SQLite (`encodings.db`).

## Setup

```bash
cd ai-service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
AI_SERVICE_KEY=dev-key-change-me .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

## API

| Method | Route | Auth |
|---|---|---|
| GET | `/health` | none → `{status, model, version}` |
| POST | `/detect` | `X-AI-Key` header |
| POST | `/register-face` | `X-AI-Key` header |
| POST | `/recognize` | `X-AI-Key` header |

Request/response shapes follow `docs/CONTRACT.md` §5a. Auth failures → `401 {"error": ...}`;
model unavailable → `503`; register with zero detectable faces → `422`.

## Notes

- `.venv/` and `encodings.db` are local-only; never commit them.
- Models are lazy-loaded at startup. If the download fails, the service still
  boots, `/health` reports `"status": "degraded"`, and POST endpoints return 503.
- `encodings.db` location can be overridden with `ENCODINGS_DB`.
