# Deployment Guide

> Last updated: 2026-03-21

This document covers everything needed to deploy, update, and troubleshoot the Life App on Railway.

---

## Overview

The app runs as a Docker container on Railway. SQLite is the database and lives on a persistent volume mounted at `/data`. Every time the container boots, `apply-schema.js` runs first to create any missing tables and columns — it is fully idempotent, so it is safe to run on every restart.

```
GitHub push to master
       │
       ▼
Railway builds Dockerfile (3-stage Alpine build)
       │
       ▼
Container starts as root → chown /data → su-exec → nextjs user
       │
       ├─ node apply-schema.js   (creates tables, bootstraps admin if needed)
       │
       └─ node server.js         (Next.js standalone server on port 3000)
```

**Production URL**: `https://life-app-production-938a.up.railway.app`

---

## Environment Variables

Set these in the Railway dashboard under your service → **Variables**.

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | Random secret for signing JWT session tokens. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DB_PATH` | Yes | Path to the SQLite file. Must be `/data/life-app.db` when using the Railway volume. |
| `NEXTAUTH_URL` | Yes | Public HTTPS URL of the app, e.g. `https://life-app-production-938a.up.railway.app` |
| `AUTH_TRUST_HOST` | Yes | Must be `true`. NextAuth v5 requires this when running behind Railway's reverse proxy, otherwise it throws `UntrustedHost`. |
| `PORT` | Yes | Must be `3000`. Railway assigns a dynamic port by default which conflicts with the Dockerfile `EXPOSE 3000`. |
| `ADMIN_USERNAME` | First deploy only | Username for the auto-bootstrapped admin account. Only used if no users exist in the database. |
| `ADMIN_PASSWORD` | First deploy only | Password for the auto-bootstrapped admin account. Hashed with bcrypt before storage. |

> After the admin account is created, `ADMIN_USERNAME` and `ADMIN_PASSWORD` can be removed from Railway variables — they are no longer needed and leaving them in is harmless but unnecessary.

---

## First Deploy (Railway Setup)

Follow these steps in order when setting up a fresh Railway deployment.

### 1. Create the Railway Project

1. Go to [railway.app](https://railway.app) and log in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select the `life-app` repository.

### 2. Set the Root Directory

Railway needs to build from `Life App/`, not the repo root (where there is no Dockerfile).

1. Go to your service → **Settings** → **Source**.
2. Set **Root Directory** to `Life App`.
3. Save. Railway will now detect the `Dockerfile` correctly.

### 3. Set Environment Variables

Go to your service → **Variables** and add all variables from the table above.

### 4. Add the Persistent Volume

Without a volume, the SQLite database is lost on every redeploy.

1. Go to your service → **Volumes** (or **Settings** → **Volumes**).
2. Click **Add Volume**.
3. Set **Mount Path** to `/data`.
4. Save.

### 5. Deploy

Trigger a deploy (or push to `master` — Railway deploys automatically on every push to the connected branch).

### 6. Verify

1. Visit the public URL → you should see the login page.
2. Log in with the credentials from `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
3. Navigate around the app — all sections should load.
4. Restart the service (Railway dashboard → **Restart**) and confirm data is still present.

---

## Redeploying After Code Changes

Redeployment is automatic: push to `master` on GitHub and Railway rebuilds and redeploys.

```bash
git add -A
git commit -m "your change"
git push origin master
```

- `apply-schema.js` runs on every boot and is **idempotent** — it uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN IF NOT EXISTS` so it is always safe to run.
- No manual migration step is needed. Schema changes go through `apply-schema.js`, not Drizzle's `migrate` command in production.
- The SQLite volume at `/data` is preserved across redeploys.

---

## How `apply-schema.js` Works

The script runs as the first process on every container start. It performs three steps:

1. **Create tables** — `CREATE TABLE IF NOT EXISTS` for every table in the schema. Safe to run repeatedly.
2. **Add columns** — `ALTER TABLE ADD COLUMN IF NOT EXISTS` for columns added in later features. If the column already exists, the statement is skipped.
3. **Bootstrap admin** — If `ADMIN_USERNAME` and `ADMIN_PASSWORD` env vars are set **and** the `users` table is empty, the script creates a hashed admin account. This only fires on the very first boot of a fresh database.

> Do not run `npx drizzle-kit migrate` in production. That command depends on Drizzle's migration tracking table and is only used in local development. Production always uses `apply-schema.js`.

---

## Container Security

The Dockerfile uses a privilege-drop pattern to solve a conflict between Railway volumes (mounted as root) and running app code as an unprivileged user:

```
# Container starts as root (no USER instruction before CMD)
CMD ["sh", "-c", "chown -R nextjs:nodejs /data && su-exec nextjs sh -c 'node apply-schema.js && node server.js'"]
```

- **Root phase**: `chown -R nextjs:nodejs /data` — fixes ownership of the Railway-mounted volume so the `nextjs` user can write to it.
- **Drop privileges**: `su-exec nextjs` — drops from root (UID 0) to `nextjs` (UID 1001) before any app code runs. `su-exec` is Alpine's lightweight equivalent of `gosu`.
- **App phase**: Both `apply-schema.js` and `server.js` run as the unprivileged `nextjs` user.

The `nextjs` user and `nodejs` group are created in the Dockerfile runner stage:

```dockerfile
RUN apk add --no-cache su-exec && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
```

---

## Admin Account Management

Accounts are managed via the `/admin/users` page (admin-only). There is no public registration.

- **Create a user**: fill in username + password on the admin page → the user can log in immediately.
- **Deactivate a user**: toggle the active switch → they cannot log in until reactivated.
- **The last active admin cannot be deactivated** — the API enforces this constraint.

To create the very first admin on a fresh database, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` as Railway environment variables before the first deploy. The `apply-schema.js` script handles the rest.

---

## Health Check

Railway monitors the app using the `/api/health` endpoint defined in `railway.toml`:

```toml
[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 120
```

- The endpoint is **public** (no authentication required) so Railway can check it without a session.
- The 120-second timeout accounts for the `apply-schema.js` run time on first boot.

## Database Backups

Daily SQLite backups are handled by `src/instrumentation.ts` (the Next.js server instrumentation hook), which runs `runDailyBackup()` once on process startup and every 24 hours thereafter. This replaces the previous approach of triggering backup from `GET /api/health`.

- Backups are written to the `backups/` directory on the same volume as `life-app.db`.
- The backup function is idempotent — it skips if today's backup file already exists.
- Admins can also trigger a manual backup via `POST /api/admin/backup` (requires admin session).

---

## Troubleshooting

### 502 "Application failed to respond"

The container built successfully but crashed at runtime. Check the deploy logs in Railway.

**Common causes**:

| Symptom in logs | Cause | Fix |
|-----------------|-------|-----|
| `no such table: users` | `apply-schema.js` did not run | Check Dockerfile CMD — must run `node apply-schema.js && node server.js` |
| `Cannot find module 'bcryptjs'` | `bcryptjs` not copied to runner stage | Add `COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs` to Dockerfile |
| `UntrustedHost` | NextAuth v5 rejects the request host | Add `AUTH_TRUST_HOST=true` to Railway variables |
| Port mismatch | App starts on wrong port | Add `PORT=3000` to Railway variables |

### `SqliteError: unable to open database file`

The container cannot write to `/data/life-app.db`.

**Causes**:
- No volume attached — add a volume at `/data` in Railway.
- Volume mounted as root but app running as non-root — the `chown` in the CMD startup handles this; if it is missing, the Dockerfile CMD has been modified incorrectly.

### Healthcheck fails / service stays "deploying"

- Check that `PORT=3000` is set.
- Check that `AUTH_TRUST_HOST=true` is set.
- The healthcheck timeout is 120 seconds — on first boot with a large schema, `apply-schema.js` can take a few seconds. If it consistently times out, check deploy logs for errors in `apply-schema.js`.

### User cannot log in after deploy

- Confirm the user account is **active** (check `/admin/users`).
- Confirm `NEXTAUTH_URL` matches the exact public URL (including `https://`, no trailing slash).
- Confirm `AUTH_SECRET` is set and has not changed — changing it invalidates all existing sessions.

---

## Local Development vs. Production

| Concern | Local | Production (Railway) |
|---------|-------|----------------------|
| Database path | `./life-app.db` (project root) | `/data/life-app.db` (volume) |
| Migrations | `npx drizzle-kit generate` + `node apply-schema.js` | `apply-schema.js` runs automatically on boot |
| Admin creation | `npx tsx src/scripts/create-admin.ts` | `ADMIN_USERNAME` + `ADMIN_PASSWORD` env vars |
| Auth URL | `http://localhost:3000` | `https://life-app-production-938a.up.railway.app` |
| `AUTH_TRUST_HOST` | Not needed | `true` (required) |
| HTTPS | Not applicable | Handled automatically by Railway |
