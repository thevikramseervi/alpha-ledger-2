# Alpha Ledger

A personal finance web app for tracking **income**, **expenses**, **investments**, and **transfers** across multiple accounts. Built for day-to-day money management with monthly dashboards, reports, net worth trends, budgets, category breakdowns, optional tags, rental income views, and investment summaries.

Currency and formatting default to **INR (`en-IN`)**.

> **Note:** This is a **single-entry cash-flow tracker** with running account balances — not a full double-entry accounting system. Categories classify transaction type for reporting. **Tags** are optional cross-cutting labels (e.g. a trip or project). Only **transfers** move money between two of your accounts in one transaction.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts, `@react-pdf/renderer` (reports PDF) |
| Backend | NestJS 11, Prisma 7, class-validator, Swagger |
| Database | PostgreSQL 16 ([Neon](https://neon.com) recommended, or Docker locally) |

## Navigation

| Route | Page |
|-------|------|
| `/` | Dashboard |
| `/reports` | Reports (analytics + export) |
| `/transactions` | Transactions |
| `/recurring` | Recurring templates |
| `/accounts` | Accounts |
| `/categories` | Categories |
| `/tags` | Tags |
| `/rental-income` | Rental income |
| `/investments` | Investments |

There is no `/dashboard` route — the dashboard is the home page (`/`).

## Features

### Dashboard (`/`)

- Monthly **Income**, **Expenses**, **Investments**, **Net savings**, and **Savings rate** cards — click KPI cards to open filtered transactions
- Stat cards show **vs last month** and **vs same month last year** comparisons
- **Net worth** section — total balance for the selected month, month change, and trend chart with **6M / 12M / YTD** range toggle
- **Cash flow chart** — income, expenses, investments, net savings with the same **6M / 12M / YTD** range
- **Spending by category** — donut chart and category list (expenses + investments)
- **Budgets** card — monthly limits vs actual spending by expense category (with manage dialog)
- Rental income summary card (when a **Rental Income** category exists)
- **Recent transactions** — up to 6 from the selected month (View all opens `/transactions` without month filters)
- **Recurring nudge** — link to review due recurring items when templates are pending for the selected month

### Reports (`/reports`)

- Tabbed insights page with **Preset** (6M / 12M / YTD + month) or **Custom range** (from/to dates, max 24 months)
- **Export CSV** — summary tables (cash flow, categories, tags, net worth, budgets) for the loaded period
- **Download full PDF** — multi-page report with analytics, charts, account balances, rental/investment summaries, and the full transaction ledger
- **Summary PDF** — same analytics and charts without the transaction ledger (faster for sharing)
- **Cash flow** — period totals, trend chart, monthly net savings list
- **Categories** — top categories, trend lines, stacked monthly bars, sub-category drill-down
- **Tags** — tagged transaction breakdown with donut chart
- **Net worth** — trend chart plus account allocation donut at period end
- **Budgets** — monthly hit rate (% categories on track), budget vs spent summary

PDF export is built **client-side** with `@react-pdf/renderer`. The frontend fetches a full data bundle from `GET /reports/export-package` (same date params as overview), then renders and downloads the file. Large ranges (500+ transactions) may take a few seconds; the button shows progress while fetching and rendering.

### Transactions (`/transactions`)

- Create, edit, and delete transactions (delete uses a confirmation dialog)
- **Search** by description or notes
- **Filters:** month, type, account, category, tag, custom from/to date range
- **Deep links** from dashboard — `?year=&month=&type=` query params pre-fill filters
- **Export CSV** — downloads the currently filtered list (includes tags and split lines; formula-injection safe)
- **Tags** — optional labels on transactions; filter by tag; manage on `/tags`
- **Due-only recurring banner** — slim banner when recurring items are due; full template management on `/recurring`
- **Split transactions** — divide one payment across multiple categories (≥2 lines, must sum to total)
- Types: **Income**, **Expense**, **Investment**, **Transfer**
- DD/MM/YYYY date entry with calendar picker
- Transaction dates must be **on or after** each account’s balance-as-of date

### Recurring (`/recurring`)

- Monthly recurring templates — income, expense, investment, or transfer
- **Active / inactive** toggle per template
- **Post for month** — creates a real transaction and records last-posted month (no duplicate post for same month)
- `dayOfMonth` controls which day of the month the posted transaction uses

### Accounts (`/accounts`)

- Cash, bank, and other accounts with running balances (updated automatically)
- **Balance as of** date + **starting balance** when creating an account (supports backfilling from earlier months)
- **Monthly statements** per account (month picker) with roll-forward layout: opening → activity → closing
- Portfolio summary: opening on 1st, mid-month additions, closing, net change
- **Balance mix** donut and horizontal bar chart by account
- **Reconcile** (`/accounts/:id/reconcile`) — mark transactions cleared, compare ledger vs statement balance
- Edit balance-as-of / starting balance after transactions exist (updates opening snapshot only; live balance unchanged)

### Categories (`/categories`)

- Full CRUD for income, expense, and investment categories
- Sub-categories per category (e.g. Groceries → Dairy, Education → Exam Fees)
- Filter categories by type

### Tags (`/tags`)

- Full CRUD for transaction tags (name + color)
- Assign **multiple tags** per transaction; filter transactions and reports by tag
- Tags are optional — categories remain required for non-transfer transactions
- In reports, tagged amounts are split evenly across a transaction’s tags when summing tag totals

### Rental income (`/rental-income`)

- Summary for the category named **Rental Income** (case-insensitive)
- Groups income by sub-category (e.g. per house or shop)

### Investments (`/investments`)

- All investment transactions with optional account filter
- Donut + progress breakdown by category and sub-category (month + year-to-date)
- Tracks **cash outflows** to investment categories — not holdings, NAV, or portfolio performance

## Getting started

### Prerequisites

- Node.js 20+
- npm
- A PostgreSQL database — **[Neon](https://neon.com)** (recommended) or Docker for local-only Postgres

### 1. Database

#### Option A — Neon (recommended)

No Docker required. Your data lives in Neon’s managed Postgres and works from any machine once `DATABASE_URL` is set.

1. Sign up at [neon.com](https://neon.com) and create a project (PostgreSQL 16).
2. In the Neon console, open **Connect** and copy the **direct** connection string (not the pooler URL — best for this NestJS app).
3. Ensure the string includes SSL — for Neon use `?sslmode=verify-full` (or keep Neon’s default query params).
4. Put it in `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=verify-full"
```

5. Apply migrations:

```bash
cd backend
npx prisma migrate deploy
```

Neon starts **empty**. Migrations create tables and the three default accounts (Cash, Kotak, HDFC). To move data from old local Docker Postgres, see [Migrating from Docker Postgres](#migrating-from-docker-postgres) below.

#### Option B — Docker PostgreSQL (local only)

From the repo root:

```bash
docker compose start
```

**First time only:**

```bash
docker compose up -d
```

| Setting | Value |
|---------|-------|
| Database | `alpha_ledger` |
| User | `alpha` |
| Password | `alpha_secret` |
| Port | `5432` |
| Container | `alpha-ledger-db` |

Set in `backend/.env`:

```env
DATABASE_URL="postgresql://alpha:alpha_secret@localhost:5432/alpha_ledger?schema=public"
```

If you see a container name conflict, the database already exists — use `docker compose start`, not `docker compose up`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run start:dev
```

- API: [http://localhost:3001/api](http://localhost:3001/api)
- Swagger: [http://localhost:3001/docs](http://localhost:3001/docs)

If `npm run db:migrate` fails because an old migration was modified locally, apply pending migrations without resetting data:

```bash
npx prisma migrate deploy
```

### 3. Frontend

In a **separate terminal**:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)

### Recommended startup order

**With Neon:** skip Docker.

1. Set `DATABASE_URL` in `backend/.env` and run `npx prisma migrate deploy` once  
2. `cd backend && npm run start:dev` — wait for “Nest application successfully started”  
3. `cd frontend && npm run dev` — frontend  

**With Docker Postgres:** `docker compose start` before step 2.

Starting backend and frontend in separate terminals avoids a heavy simultaneous compile on first run.

### Migrating from Docker Postgres

If you already have data in local Docker and want it on Neon:

```bash
# Export from Docker (adjust db name if you used alpha_ledger_app)
docker exec alpha-ledger-db pg_dump -U alpha -d alpha_ledger_app --no-owner --no-acl > alpha-ledger-backup.sql

# Import to Neon (paste your Neon direct connection string)
psql "postgresql://USER:PASSWORD@ep-xxxx.neon.tech/neondb?sslmode=require" < alpha-ledger-backup.sql
```

If starting fresh on Neon, skip this — `prisma migrate deploy` is enough.

### First-time use

There is **no seed script**. After migrating, open the app and:

1. Use or edit the **three default accounts** from the `add_accounts` migration (Cash, Kotak, HDFC) — or add your own on **Accounts**
2. Add **categories** (required before most transactions)
3. Optionally add **tags** on **Tags**
4. Add **transactions**

Categories are not seeded — only the three default accounts exist on a fresh database.

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon direct URL with `?sslmode=verify-full`, or local Docker URL) |
| `PORT` | API port (default `3001`) |
| `HOST` | Listen address — dev defaults to `0.0.0.0` for LAN; production uses `127.0.0.1` |
| `FRONTEND_URL` | Primary CORS origin (default `http://localhost:3000`) |
| `API_KEY` | Optional in dev; **required in production**. When set, all routes need `x-api-key` header |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (default `http://localhost:3001/api`) |
| `NEXT_PUBLIC_API_KEY` | Must match backend `API_KEY` when API is protected |
| `DEV_ALLOWED_ORIGINS` | Extra hostnames for Next.js HMR on LAN/hotspot (comma-separated IPs) |

### Mobile / LAN access

- Backend dev server binds to `0.0.0.0`; frontend uses `next dev --hostname 0.0.0.0`
- Open the app from your phone using your laptop’s **real IP** (e.g. `http://192.168.x.x:3000`), not `0.0.0.0`
- Set matching `API_KEY` / `NEXT_PUBLIC_API_KEY` if exposing the API on the network

## API overview

All routes are prefixed with `/api`. When `API_KEY` is set, include header `x-api-key: <key>`.

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions` | List — filter: `year`, `month`, `type`, `categoryId`, `accountId`, `search`, `fromDate`, `toDate`, `tagId` |
| POST | `/transactions` | Create (optional `splits[]`, `tagIds[]`) |
| GET | `/transactions/:id` | Get one |
| PATCH | `/transactions/:id` | Update (supports `cleared`, `splits[]`, `tagIds[]`) |
| DELETE | `/transactions/:id` | Delete |
| GET | `/transactions/summary/monthly` | Monthly dashboard stats |
| GET | `/transactions/summary/yearly` | Yearly cash-flow trend |
| GET | `/transactions/summary/rental-income` | Rental income summary |
| GET | `/transactions/summary/investments` | Investment summary |

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts` | List all |
| GET | `/accounts/balance-summary?year=&month=` | Monthly opening/closing per account + portfolio totals |
| GET | `/accounts/balance-trend?year=` | Net worth (total closing) for each month of the year |
| POST | `/accounts` | Create — `trackingStartDate`, optional `initialBalance` |
| GET | `/accounts/:id` | Get one |
| GET | `/accounts/:id/reconciliation` | Reconciliation view |
| PATCH | `/accounts/:id` | Update name, type, color; edit `trackingStartDate` / `initialBalance` (with transactions: snapshot only — live `balance` unchanged) |
| DELETE | `/accounts/:id` | Delete (blocked if transactions or recurring items reference the account) |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List (optional filter: `type`) |
| POST | `/categories` | Create |
| GET | `/categories/:id` | Get one |
| PATCH | `/categories/:id` | Update |
| DELETE | `/categories/:id` | Delete |
| POST | `/categories/:categoryId/sub-categories` | Create sub-category |
| PATCH | `/categories/:categoryId/sub-categories/:subCategoryId` | Update sub-category |
| DELETE | `/categories/:categoryId/sub-categories/:subCategoryId` | Delete sub-category |

### Recurring transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/recurring-transactions` | List all |
| POST | `/recurring-transactions` | Create |
| GET | `/recurring-transactions/:id` | Get one |
| PATCH | `/recurring-transactions/:id` | Update |
| DELETE | `/recurring-transactions/:id` | Delete |
| POST | `/recurring-transactions/:id/post` | Post for `{ year, month }` |

### Budgets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/budgets/overview?year=&month=` | Budget vs actual for expense categories |
| PUT | `/budgets/sync` | Set or clear monthly budgets (`amount: 0` removes) |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/overview?year=&month=&range=6m\|12m\|ytd` | Cash flow, categories, tags, net worth, and budget history ending at the selected month |
| GET | `/reports/overview?fromDate=&toDate=` | Same overview for a custom date range (max 24 months) |
| GET | `/reports/export-package?year=&month=&range=6m\|12m\|ytd` | Full data bundle for PDF export (same query params as overview) |
| GET | `/reports/export-package?fromDate=&toDate=` | Export bundle for a custom date range |

Overview response includes `periodMode` (`preset` \| `custom`), `fromDate`, `toDate`, and `tags[]` breakdown when applicable.

**Export package** adds: all transactions in the period (with accounts, categories, splits, tags), monthly account balance summaries, end-month budget overview, rental/investment snapshots for the latest month, and **period-scoped** rental/investment totals (`rentalIncomePeriod`, `investmentSummaryPeriod`) aggregated across the full selected range.

### Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tags` | List all tags |
| POST | `/tags` | Create tag `{ name, color? }` |
| PATCH | `/tags/:id` | Update tag |
| DELETE | `/tags/:id` | Delete tag (removes links from transactions) |

## Transaction rules

| Type | Category required? | Account effect |
|------|-------------------|----------------|
| Income | Yes (or splits) | Selected account balance **increases** |
| Expense | Yes (or splits) | Selected account balance **decreases** |
| Investment | Yes | Selected account balance **decreases** (cash out) |
| Transfer | No | Source **decreases**, destination **increases** |

- Transfers require **from** and **to** accounts (must be different).
- **Splits** are only for non-transfer transactions; split amounts must sum to the transaction total.
- **Tags** are optional on any transaction type; they do not affect balances.
- Toggling **cleared** alone does not recalculate account balances.
- Transaction **date** must be on or after the **balance-as-of date** of every account the transaction touches.

## Account balances explained

| Term | Meaning |
|------|---------|
| **Balance as of** | The date your starting balance applies to (e.g. `1 Apr 2026`) — not the day you clicked “Add account” |
| **Starting balance** | How much was in the account on the balance-as-of date, before you add transactions |
| **Current balance** | Live total after all recorded transactions |
| **Opening (month)** | Calendar opening (1st of month) or balance-as-of snapshot for mid-month tracking starts |
| **Closing (month)** | Balance at month end, or **to date** for the current month |
| **Net worth** | Sum of all account closing balances for a month |
| **Reconcile** | Match app ledger to your bank statement using cleared transactions |

### Backfilling history

1. Create account with **Balance as of** = first day you want history (e.g. `2026-04-01`)
2. Enter **Starting balance** = account balance on that date
3. Add transactions from that date forward

Months **before** the balance-as-of date show no statement data. Reconcile uses all transactions; monthly statements use transaction dates, not account create time.

## Project structure

```
alpha-ledger-2/
├── backend/
│   ├── prisma/                    # Schema and migrations
│   └── src/
│       ├── accounts/
│       ├── budgets/
│       ├── categories/
│       ├── recurring-transactions/
│       ├── reports/
│       ├── tags/
│       ├── transactions/
│       └── common/                # Balance effects, summaries, dates, CORS, API key guard
├── frontend/
│   └── src/
│       ├── app/                   # App Router pages
│       ├── components/
│       │   ├── dashboard/
│       │   ├── reports/
│       │   ├── transactions/
│       │   ├── recurring/
│       │   ├── tags/
│       │   ├── accounts/
│       │   └── shared/
│       └── lib/                   # API client, charts, CSV/PDF export (reports-pdf/), INR formatting
├── docker-compose.yml
└── .cursorignore                  # Excludes node_modules, .next, dist from indexing
```

## Useful commands

```bash
# Database (from repo root)
docker compose start      # start existing container
docker compose up -d      # first-time create
docker compose down

# Backend
cd backend
npm run start:dev
npm run db:migrate        # dev: create/apply migrations
npx prisma migrate deploy # apply pending migrations without reset
npm run db:studio
npm run build

# Frontend
cd frontend
npm run dev
npm run build
npm run lint
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API returns 500 | Check `DATABASE_URL`; for Neon ensure SSL (`sslmode=verify-full`). For Docker: `docker compose start` |
| API returns 401 | Set `NEXT_PUBLIC_API_KEY` to match backend `API_KEY` |
| `docker compose up` container conflict | Container already exists — use `docker compose start` |
| Frontend can’t reach API | Backend running on 3001? Check `NEXT_PUBLIC_API_URL` |
| Dashboard/accounts empty for old months | Pick a month on or after each account’s balance-as-of date |
| Port 3000 in use | Stop other Next.js dev servers before starting frontend |
| Phone can’t load app on LAN | Use laptop IP, not `0.0.0.0`; ensure backend is running on `:3001` |
| HMR WebSocket fails on LAN | Add your IP to `DEV_ALLOWED_ORIGINS` in frontend `.env.local` |
| `migrate dev` wants to reset DB | Use `npx prisma migrate deploy` to apply pending migrations only |
| Reports custom range error | `fromDate` must be ≤ `toDate`; range capped at 24 months |
| PDF export slow or fails | Restart backend after updates; large ranges (500+ txns) take longer; check browser console for render errors |
| No categories on fresh DB | Expected — create categories in the app (only accounts are pre-inserted) |

## Scope (what this app is not)

- No bank CSV import, Plaid sync, or receipt attachments
- No multi-user login — optional shared API key only
- No holdings / NAV / portfolio performance — investments are cash-flow outflows
- No multi-currency — INR only
- No automated tests in CI yet — balance logic should be verified manually after changes

## Further reading

- [backend/README.md](./backend/README.md) — API and database development
- [frontend/README.md](./frontend/README.md) — UI development
- [frontend/AGENTS.md](./frontend/AGENTS.md) — notes for AI coding assistants
