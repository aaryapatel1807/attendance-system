# API Contract — Face Recognition Attendance System

Single source of truth for how the three services talk. All three
implementers MUST follow this exactly. URLs are relative; ports below
are defaults (override via env).

- **client** (React SPA, Vite): `http://localhost:5173`
- **server** (Express): `http://localhost:5000` — all routes prefixed `/api`
- **ai-service** (FastAPI): `http://localhost:8000` — no `/api` prefix

## Conventions

- JSON everywhere. Dates are ISO-8601 strings. Times are `HH:mm`.
- Express errors: `{ "error": "human readable message" }` with proper status codes.
- JWT: `Authorization: Bearer <token>`. Token payload: `{ sub: userId, role }`.
- Image transfer: base64 **data-URL** strings (`data:image/jpeg;base64,...`),
  max 5 images per registration call. AI service strips the prefix.
- Pagination: `?page=1&limit=20` on list endpoints → `{ data: [...], total, page, pages }`.
- Env: `JWT_SECRET`, `MONGO_URI`, `AI_SERVICE_URL` (default `http://localhost:8000`),
  `AI_SERVICE_KEY` (shared secret header `X-AI-Key` on server→ai-service calls).

---

## 1. Auth (Express)

| Method | Route | Body | Response |
|---|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user: { id, name, email, role } }` |
| POST | `/api/auth/logout` | — | `{ ok: true }` |
| GET | `/api/auth/me` | — (auth) | `{ user: { id, name, email, role } }` |

Roles: `admin`, `teacher`. Seed users:
- admin: `admin@college.edu` / `admin123`
- teacher: `sharma@college.edu` / `teacher123` (name "Professor Sharma")

## 2. Students (Express, auth: admin or teacher; write ops: admin)

Student shape:
```json
{
  "id": "string", "rollNumber": "CS2024001", "name": "Aarav Patel",
  "email": "aarav@college.edu", "phone": "9876543210",
  "department": "Computer Science", "semester": 5,
  "photo": "data-url or url", "faceRegistered": true,
  "attendancePercent": 82.5, "lastAttendance": "2026-10-10T09:30:00.000Z"
}
```

| Method | Route | Notes |
|---|---|---|
| GET | `/api/students?search=&department=&semester=&page=&limit=` | `data` + pagination |
| POST | `/api/students` | body = student fields (no id). Admin only. |
| GET | `/api/students/:id` | includes `attendanceHistory: [{date, subject, status, time}]` |
| PUT | `/api/students/:id` | Admin only. |
| DELETE | `/api/students/:id` | Admin only. |
| GET | `/api/students/:id/stats` | `{ percent, present, absent, total, history: [{date, subject, status}] }` |

## 3. Teachers (Express, auth: admin)

Teacher shape: `{ id, name, email, department, assignedClasses: [classId] }`
CRUD: `GET /api/teachers`, `POST /api/teachers` `{name,email,password,department}`,
`PUT /api/teachers/:id`, `DELETE /api/teachers/:id`.

## 4. Departments & Classes (Express, auth; write: admin)

- `GET/POST /api/departments`, `DELETE /api/departments/:id`
  → `{ id, name }`
- Class shape: `{ id, name, department, semester, subject, teacherId, teacherName, schedule }`
- `GET/POST /api/classes`, `PUT /api/classes/:id`, `DELETE /api/classes/:id`

## 5. Face pipeline

### 5a. FastAPI (ai-service) — internal, keyed by `X-AI-Key`

```
GET  /health
  → { "status": "ok", "model": "mediapipe+facenet", "version": "1.0.0" }

POST /detect
  body: { "image": "data-url" }
  → { "faces": [ { "bbox": [x, y, w, h], "confidence": 0.99 } ] }
    # bbox in pixels relative to the input image

POST /register-face
  body: { "student_id": "CS2024001", "images": ["data-url", ...] }  # 1..5 images
  → { "success": true, "faces_found": 3, "embedding_dim": 512 }
  # stores mean embedding for student_id; each image must contain ≥1 face

POST /recognize
  body: { "image": "data-url" }
  → {
      "matches": [
        { "student_id": "CS2024001", "confidence": 0.93, "bbox": [x,y,w,h] }
      ],
      "unknown": [ { "bbox": [x,y,w,h] } ]
    }
  # confidence = cosine similarity 0..1. Match iff similarity ≥ 0.55.
  # Sort matches by confidence desc.
```

### 5b. Express proxy (frontend calls THESE, never FastAPI directly)

- `POST /api/face/register` body `{ studentId, images: [data-url] }`
  → proxies to FastAPI `/register-face`; on success sets `students.faceRegistered=true`.
- `POST /api/face/recognize` body `{ image }`
  → proxies to FastAPI `/recognize`; enriches each match with
  `{ studentId, name, rollNumber, department, photo, confidence, bbox }`.
  Unknown faces stay as `{ bbox }`.

## 6. Attendance (Express)

Record shape: `{ id, studentId, classId, subject, date: "YYYY-MM-DD", status: "present"|"absent", time: "HH:mm", confidence }`

| Method | Route | Notes |
|---|---|---|
| POST | `/api/attendance` | body `{ classId, subject, date, records: [{ studentId, status, confidence }] }` → upsert per student+class+date. Returns `{ saved: n }`. |
| GET | `/api/attendance?classId=&date=&from=&to=&status=` | list |
| GET | `/api/attendance/history?classId=` | `{ history: [{ date, subject, present, absent, total }] }` |

## 7. Dashboard (Express)

`GET /api/dashboard/stats?classId=` →
```json
{
  "totalStudents": 240, "presentToday": 198, "absentToday": 42,
  "recognitionAccuracy": 96.4,
  "weeklyTrend": [ { "day": "Mon", "present": 190, "absent": 50 }, ... 7 ],
  "departmentBars": [ { "department": "CS", "percent": 87 }, ... ],
  "todayDonut": { "present": 198, "absent": 42 },
  "recentActivity": [ { "text": "Attendance saved for CS-5A", "time": "09:42", "type": "success" } ]
}
```

## 8. Reports (Express)

`GET /api/reports?range=weekly|monthly&department=&subject=`
→ `{ summary: {...}, daily: [{date, present, absent}], byDepartment: [...], bySubject: [...], heatmap: [{date, percent}] }`

`GET /api/reports/export?format=csv|pdf&range=&department=&subject=`
→ file download (`text/csv` or `application/pdf`).

## 9. Seed data

Server ships `npm run seed`: 1 admin, 2 teachers, 4 departments,
6 classes, 24 students (with `faceRegistered` mixed), 14 days of
attendance history. Must be idempotent.

---

## Frontend pages (client implements ALL)

`/login`, `/` (dashboard), `/attendance` (camera hero),
`/students`, `/students/:id`, `/students/register-face` (admin),
`/classes`, `/reports`, `/settings`.
Redux slices: `auth`, `dashboard`, `students`, `attendance`, `notifications`.
Theme: indigo `#4F46E5` → violet `#7C3ED` gradients, glassmorphism,
rounded 20–28px cards, Inter font, Framer Motion animations,
Recharts charts, react-webcam camera, lucide-react icons, dark mode.
