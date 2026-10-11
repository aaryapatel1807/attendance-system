# Face Recognition Attendance System

Premium AI-powered attendance management: teachers mark attendance by scanning
faces with a camera. React SPA + Express API + MongoDB + FastAPI AI service.

## Architecture

```
React SPA (Vite, :5173) ──Axios/JWT──▶ Express API (:5000) ──X-AI-Key──▶ FastAPI AI (:8000)
                                          │                                  │
                                          ▼                                  ▼
                                       MongoDB                        MediaPipe + FaceNet
                                   (users, students,               (pretrained, no custom
                                    attendance, …)                  training)
```

## Quickstart (3 terminals)

**Prereqs:** Node ≥ 20, Python 3.10–3.12, MongoDB (or `docker compose up -d`).

```bash
# 1 — AI service
cd ai-service && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
AI_SERVICE_KEY=change-me .venv/bin/uvicorn main:app --port 8000
# first boot downloads ~90MB FaceNet weights + MediaPipe model (~40s), ~10s after

# 2 — API server
cd server && npm install && cp .env.example .env   # set MONGO_URI, JWT_SECRET, AI_SERVICE_KEY
npm run seed        # admin@college.edu/admin123, sharma@college.edu/teacher123
npm run dev         # :5000

# 3 — Frontend
cd client && npm install && npm run dev             # :5173
```

Open http://localhost:5173 → login with the seeded credentials above.

## What was built

- **client/** — React + TS + Tailwind v4 + Redux Toolkit + React Router + Framer Motion +
  Recharts + react-webcam. 9 pages: login, dashboard (animated stats, trend/donut/bar
  charts, activity feed), attendance (camera hero with scan animation + staged
  recognition status), students (card grid, search/filters), student detail
  (attendance ring, history), register-face (admin), classes, reports (charts,
  heatmap, CSV/PDF export), settings (dark mode, persisted). Dark mode is
  Linear/Vercel-style deep gray.
- **server/** — Express + Mongoose + JWT + bcrypt. Full CRUD for users/teachers/
  departments/classes/students, attendance upsert, real computed dashboard stats,
  reports + real CSV/PDF export, `/api/face/*` proxies to the AI service.
- **ai-service/** — FastAPI. MediaPipe face detection + DeepFace FaceNet512
  embeddings stored in SQLite; `/health`, `/detect`, `/register-face`,
  `/recognize`. Match threshold 0.55 cosine similarity.
- **docs/CONTRACT.md** — the API contract all three services follow.

## Notes

- Linux hosts need `libegl1` + `libgles2` for MediaPipe (`apt-get install -y libegl1 libgles2`).
- The frontend never talks to FastAPI directly — all AI calls go through Express.
- Demo seed: 1 admin, 2 teachers, 4 departments, 6 classes, 24 students,
  14 days of attendance history. `npm run seed` is idempotent.
