# Yousuf Keyhan MIS — Backend

NestJS API for the **Yousuf Keyhan** rice-mill management system. It handles seasons, inventory (paddy/rice), sales, expenses, employees, investors, sarafi (money exchange), cash, reports, and role-based access control (RBAC).

## Tech stack

- **Runtime:** Node.js (20+ recommended)
- **Framework:** NestJS 11
- **Database:** PostgreSQL via Prisma 7
- **Auth:** JWT in httpOnly cookies + CSRF protection
- **API docs:** Swagger at `/api`

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- [PostgreSQL](https://www.postgresql.org/) 14+
- npm (included with Node.js)

## Quick start

### 1. Install dependencies

```bash
cd yousuf-keyhan-backend
npm install
```

### 2. Configure environment

Copy the example file and edit values for your machine:

```bash
cp .env.example .env
```

Minimum variables to set:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_DATABASE_URL` | Direct URL (same as `DATABASE_URL` for local dev) |
| `SHADOW_DATABASE_URL` | Shadow DB for migrations (create a separate database) |
| `JWT_ACCESS_SECRET` | Long random string (`openssl rand -base64 64`) |
| `JWT_REFRESH_SECRET` | Different long random string |
| `FRONTEND_URL` | Frontend origin, e.g. `http://localhost:5173` |

See `.env.example` for throttling, cookie, and seed settings.

### 3. Create databases

Create the main and shadow databases in PostgreSQL (names must match your URLs):

```sql
CREATE DATABASE rice_management;
CREATE DATABASE rice_management_shadow;
```

### 4. Run migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

For local development when you change the schema:

```bash
npx prisma migrate dev --name describe_your_change
```

**Important:** Coolify/production only runs `prisma migrate deploy`. Never rely on `prisma db push` for changes that must reach production — missing migrations cause API **500** errors when Prisma queries columns that do not exist yet.

Before you push or deploy, verify schema and migrations match:

```bash
npm run prisma:migrate:check
```

Requires `SHADOW_DATABASE_URL` (see `.env.example`). Fix any reported drift with `npx prisma migrate dev` before deploying.

### 5. Seed roles, permissions, and admin user

```bash
npm run prisma:seed
```

Default admin (override in `.env`):

- **Email:** `admin@example.com` (or `SEED_ADMIN_EMAIL`)
- **Password:** `Admin@12345` (or `SEED_ADMIN_PASSWORD`)

Change the seed password before any shared or production environment.

### 6. Start the API

**Development (watch mode):**

```bash
npm run start:dev
```

**Production build:**

```bash
npm run build
npm run start:prod
```

The server listens on **`http://localhost:3005`** by default (`PORT` in `.env`).

## API documentation

With the server running, open:

- **Swagger UI:** [http://localhost:3005/api](http://localhost:3005/api)

Authentication uses cookies (`yk_access_token`). Log in via the frontend or the auth endpoints, then use Swagger with credentials enabled in the browser.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start with hot reload |
| `npm run start:debug` | Start with debugger |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled app |
| `npm run lint` | ESLint (with auto-fix) |
| `npm run test` | Unit tests (Jest) |
| `npm run test:e2e` | End-to-end tests |
| `npm run prisma:seed` | Seed permissions, roles, admin user |
| `npm run prisma:migrate:check` | Fail if schema.prisma drifted from migrations (run before deploy) |
| `npm run prisma:deploy` | Apply migrations + regenerate client (production) |

## Project layout

```
src/
  modules/          # Feature modules (seasons, customers, warehouses, …)
  common/           # Auth config, guards, RBAC constants
  infrastructure/   # Prisma service
prisma/
  schema.prisma     # Data model
  migrations/       # SQL migrations
  seed.ts           # Initial data
uploads/            # Profile pictures (created at runtime)
```

## Frontend integration

- Set **`FRONTEND_URL`** to the Vite dev server (`http://localhost:5173`) or your deployed UI URL.
- CORS is **credential-based**; wildcards are not used.
- The admin UI can send **`X-View-Season-Id`** to read data for a non-active season; writes are blocked unless that season is active.

For cross-origin production (e.g. `app.example.com` + `api.example.com`), configure cookie options in `.env` as described in `.env.example` (`COOKIE_SAMESITE`, `COOKIE_SECURE`, `COOKIE_DOMAIN`).

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| `Can't reach database` | PostgreSQL running, `DATABASE_URL` correct, DB exists |
| Migration fails | `SHADOW_DATABASE_URL` points to an empty shadow DB |
| CORS errors from frontend | `FRONTEND_URL` matches the browser origin exactly |
| 401 after login | Cookies blocked; use same-site or HTTPS + `COOKIE_SAMESITE=none` for cross-origin |
| Permission denied | Re-run `npm run prisma:seed` after adding new modules in code |

## Security notes

- Never commit `.env` or real JWT secrets.
- Use strong, unique `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in production.
- Rotate seed admin credentials after first login in non-dev environments.
# y-backend
