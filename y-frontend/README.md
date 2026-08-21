# Yousuf Keyhan MIS — Frontend

React admin application for the **Yousuf Keyhan** rice-mill management system. It connects to the NestJS backend for seasons, inventory, sales, ledgers, expenses, employees, investors, reports, and user/role management.

## Tech stack

- **Runtime:** Node.js (20+ recommended)
- **UI:** React 19 + Vite 6
- **Styling:** Tailwind CSS 4
- **Forms:** React Hook Form + Zod
- **Data:** TanStack Query
- **Routing:** React Router 7
- **i18n:** English, Dari (`dr`), Pashto (`ps`)

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- npm
- Backend API running (see [yousuf-keyhan-backend/README.md](../yousuf-keyhan-backend/README.md))

## Quick start

### 1. Install dependencies

```bash
cd yousuf-keyhan-frontend
npm install
```

### 2. Configure environment

Copy the example file:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend base URL (no trailing slash), e.g. `http://localhost:3005` |

### 3. Start the backend

In the backend project:

```bash
npm run start:dev
```

Ensure migrations and seed have been applied at least once.

### 4. Start the frontend

```bash
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in the browser.

Admin routes live under **`/yk/...`** (e.g. `/yk/dashboard`). Sign in with the seeded admin user from the backend README.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server (Vite, port 5173) |
| `npm run build` | Type-check + production build (`dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

## Production build

```bash
npm run build
npm run preview
```

Deploy the contents of `dist/` behind any static host (nginx, S3 + CloudFront, etc.). Set **`VITE_API_BASE_URL`** at build time to your production API URL:

```bash
VITE_API_BASE_URL=https://api.your-domain.com npm run build
```

## Languages

Translations are under `src/i18n/`:

- `en` — English
- `dr` — Dari
- `ps` — Pashto

The app detects language from the browser and stores the choice in `localStorage`. RTL layout is applied for Dari and Pashto.

## Project layout

```
src/
  api/              # Axios client, auth helpers
  components/       # Shared UI (forms, tables, date picker, …)
  features/admin/   # Feature screens (expenses, warehouses, reports, …)
  i18n/             # Locale JSON files
  routes/           # React Router configuration
  utils/            # Formatters, weight units, etc.
```

Path alias **`@/`** maps to `src/` (see `vite.config.ts`).

## Backend integration

- All API calls go through `src/api/client.ts` using `VITE_API_BASE_URL`.
- Auth uses **httpOnly cookies**; the browser must send credentials (`withCredentials: true`).
- **`FRONTEND_URL`** on the backend must include `http://localhost:5173` for local dev.
- Season switching sends **`X-View-Season-Id`** so lists and reports can show historical seasons.

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Network error / CORS | Backend running; `VITE_API_BASE_URL` correct; `FRONTEND_URL` on API matches this origin |
| Login succeeds but 401 on pages | Third-party cookies blocked; same-site deployment or HTTPS + API cookie settings |
| Blank page after build | Base path / reverse proxy serves `index.html` for SPA routes |
| Type errors before deploy | Run `npm run build` locally; fix TypeScript errors before shipping |

## Related repository

Backend setup, database, and API docs:

**[../yousuf-keyhan-backend/README.md](../yousuf-keyhan-backend/README.md)**
# y-frontend
