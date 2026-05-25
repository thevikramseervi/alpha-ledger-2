# Deploy Alpha Ledger (phone + anywhere access)

This guide deploys **Alpha Ledger** so you can open it on your phone from anywhere — not only on your home Wi‑Fi.

**Architecture**

| Piece | Where | You already have |
|-------|--------|------------------|
| Database | [Neon](https://neon.com) | Likely yes |
| Backend (NestJS API) | [Railway](https://railway.app) or [Render](https://render.com) | — |
| Frontend (Next.js) | [Vercel](https://vercel.com) | — |

Neon stays as-is. You deploy the API and the web app, then point them at each other with environment variables.

---

## Before you start

1. **Push this repo to GitHub** (private repo recommended — personal finance data).
2. **Neon `DATABASE_URL`** — direct connection string with `?sslmode=verify-full`.
3. **Generate an API key** (required in production):

```bash
openssl rand -hex 32
```

Save it — you will use the **same value** for backend `API_KEY` and frontend `NEXT_PUBLIC_API_KEY`.

---

## Step 1 — Deploy the backend (Railway)

1. Sign in at [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select your `alpha-ledger-2` repository.
3. Railway adds a service — open it → **Settings**:
   - **Root Directory:** `backend`
   - **Builder:** Dockerfile (uses `backend/Dockerfile` + `backend/railway.toml`)
4. **Variables** → add:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your Neon direct URL |
| `API_KEY` | The key from `openssl rand -hex 32` |
| `FRONTEND_URL` | `https://PLACEHOLDER.vercel.app` (update after Step 2) |
| `HOST` | `0.0.0.0` |
| `PRISMA_TRANSACTION_TIMEOUT_MS` | `30000` |

5. **Settings** → **Networking** → **Generate Domain** (e.g. `alpha-ledger-api.up.railway.app`).
6. Wait for deploy to finish. Test:

```bash
curl https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/health
# → {"ok":true}
```

Migrations run automatically on each deploy (`prisma migrate deploy` in the Docker start command).

### Render alternative

1. [render.com](https://render.com) → **New Web Service** → connect repo.
2. **Root Directory:** `backend`
3. **Environment:** Docker
4. Same env vars as above.
5. Use the Render URL as your API base (e.g. `https://alpha-ledger-api.onrender.com`).

---

## Step 2 — Deploy the frontend (Vercel)

1. Sign in at [vercel.com](https://vercel.com) → **Add New Project** → import the same GitHub repo.
2. **Root Directory:** `frontend`
3. Framework preset: **Next.js** (auto-detected).
4. **Environment Variables:**

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RAILWAY-DOMAIN.up.railway.app/api` |
| `NEXT_PUBLIC_API_KEY` | Same as backend `API_KEY` |

5. **Deploy**.
6. Copy your Vercel URL (e.g. `https://alpha-ledger.vercel.app`).

---

## Step 3 — Link frontend ↔ backend (CORS)

Go back to **Railway** (backend service) → **Variables**:

```env
FRONTEND_URL=https://alpha-ledger.vercel.app
```

If you use Vercel preview URLs too, comma-separate them:

```env
FRONTEND_URL=https://alpha-ledger.vercel.app,https://alpha-ledger-git-main-you.vercel.app
```

Redeploy the backend (Railway redeploys automatically when variables change).

---

## Step 4 — Open on your phone

1. Open your **Vercel URL** in the phone browser (Safari / Chrome).
2. **Add to Home Screen** (optional) — acts like an app icon.
3. Log in is just the API key baked into the frontend build — **keep the repo private** and treat `API_KEY` as a password.

---

## Security checklist

- [ ] GitHub repo is **private**
- [ ] Strong `API_KEY` set on backend **and** frontend
- [ ] Neon dashboard access is only your account
- [ ] Do not share the Vercel URL publicly if you care about privacy (anyone with the URL + built-in key can read your data)
- [ ] Optional: add Vercel **Password Protection** (Pro) or put the app behind Cloudflare Access

There is no multi-user login — the API key **is** the access control. For a personal tracker this is fine; do not deploy without `API_KEY`.

---

## Updating after code changes

```bash
git push origin main
```

Vercel and Railway redeploy from `main` automatically (if connected).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Frontend loads but all API calls fail | Check `NEXT_PUBLIC_API_URL` ends with `/api`; redeploy frontend after changing it |
| CORS error in browser console | `FRONTEND_URL` on backend must exactly match the browser origin (scheme + host, no trailing slash) |
| `401 Unauthorized` | `NEXT_PUBLIC_API_KEY` must match backend `API_KEY`; redeploy both after changing |
| Backend crash on start | Check Railway logs; usually bad `DATABASE_URL` or missing `API_KEY` in production |
| `API_KEY environment variable is required` | Set `API_KEY` on Railway and redeploy |
| Slow first request on Render free tier | Render sleeps inactive services — upgrade or use Railway |
| PDF/XLSX export fails on phone | Same API must be reachable; large exports need a stable connection |

---

## Local dev vs production

| | Local dev | Production |
|---|-----------|------------|
| Frontend | `http://localhost:3000` | `https://….vercel.app` |
| API | `http://localhost:3001/api` | `https://….railway.app/api` |
| LAN phone test | `http://192.168.x.x:3000` (dev only) | Use deployed Vercel URL instead |
| API key | Optional | **Required** |

---

## Cost (typical personal use)

- **Neon** — free tier is enough for one user
- **Vercel** — free tier for hobby projects
- **Railway** — small monthly credit; watch usage in dashboard
- **Render** — free tier available (cold starts)

---

## Further reading

- [README.md](./README.md) — features and local setup
- [backend/README.md](./backend/README.md) — API and env vars
- [frontend/README.md](./frontend/README.md) — frontend env vars
