# FaceTrack AI — Client (React SPA)

Premium AI-powered face recognition attendance frontend.

## Stack

Vite + React 19 + TypeScript · Tailwind CSS v4 · React Router · Redux Toolkit ·
Axios · Framer Motion · Recharts · react-webcam · lucide-react

## Run

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # type-check + production build
```

## Env

| Var | Default |
|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` |

Set via `.env.development` (committed for local dev). The client **only** talks to
the Express API (`/api/*`) — never to FastAPI directly (see `docs/CONTRACT.md`).

## Routes

| Path | Page |
|---|---|
| `/login` | Split-screen sign-in (demo creds shown) |
| `/` | Dashboard — greeting hero, stat cards, charts, quick actions |
| `/attendance` | Camera hero: scan → staged recognition → save |
| `/students` | Card grid, search/filters, admin add/edit/delete |
| `/students/:id` | Profile, attendance ring, history timeline |
| `/students/register-face` | Admin: enroll 3–5 face photos |
| `/classes` | Classes + departments management (admin) |
| `/reports` | Analytics + CSV/PDF export |
| `/settings` | Profile, light/dark theme, about, logout |

## Auth

JWT stored in `localStorage` (`fats_token`), attached by an Axios request
interceptor. A 401 response clears the token and routes to `/login`.
Seed accounts: `sharma@college.edu` / `teacher123` (teacher),
`admin@college.edu` / `admin123` (admin).

## Notes for backend implementers

- Face upload/transfer uses base64 **data-URL** strings (`data:image/jpeg;base64,…`).
- Export downloads expect `GET /api/reports/export?format=csv|pdf` → file blob.
- Theme: indigo `#4F46E5` → violet `#7C3AED` gradients; dark mode = deep gray
  (`#0B0D12`/`#14161D`), toggled by the `dark` class on `<html>`.
