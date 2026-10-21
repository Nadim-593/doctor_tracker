# CareTrack frontend

Doctor Tracker's frontend foundation lives in this directory. It uses the Next.js App Router, JavaScript, Tailwind CSS 4, TanStack Query, React Hook Form, Zod, Lucide React, and Recharts.

## Run

```bash
cd client
npm install
Copy-Item .env.example .env.local
# Set NEXT_PUBLIC_API_URL to the backend API base URL in .env.local
npm run dev
```

The app opens at `http://localhost:3000`. Use `npm run lint` and `npm run build` to check it. The production build selects webpack because the Windows sandbox used for this workspace cannot start Turbopack's CSS worker process.

## Routes

- `/login` — admin sign-in using the API's HTTP-only JWT cookie.
- `/dashboard` — API-backed totals, date-filtered trends/distributions, patients per doctor, and recent records.
- `/doctors`, `/doctors/new`, `/doctors/[id]`, `/doctors/[id]/edit` — doctor list and CRUD screens.
- `/patients`, `/patients/new`, `/patients/[id]`, `/patients/[id]/edit` — patient list and CRUD screens.
- `not-found.js` — shared 404 screen.

## API contract expected by the UI

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:4000/api/v1`. The client calls:

- `GET /doctors?q=&specialization=&page=&limit=` and `GET /patients?q=&doctor=&condition=&page=&limit=`
- `GET /doctors/:id`, `GET /patients/:id`
- `POST /doctors`, `PATCH /doctors/:id`, `DELETE /doctors/:id`
- `POST /patients`, `PATCH /patients/:id`, `DELETE /patients/:id`
- `GET /dashboard/summary`, `/dashboard/trends`, `/dashboard/patients-per-doctor`, and `/dashboard/distributions`
- `GET /doctors/:doctorId/patients` and `POST /doctors/:doctorId/patients`

List responses use `{ items, total, pagination: { page, limit, total, totalPages } }`. Detail responses use `{ data: record }`. Doctor records use `specialization`; patients use `doctor` as the MongoDB id and may include a populated `doctor: { name, specialization }`. The UI does not create sample records or fallback statistics. All protected requests include credentials. See the root README for backend startup and API details.
