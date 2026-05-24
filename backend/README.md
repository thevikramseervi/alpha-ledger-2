# Alpha Ledger — Backend

NestJS REST API with Prisma and PostgreSQL.

## Setup

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run start:dev
```

Ensure Docker Postgres is running from the repo root before migrating:

```bash
docker compose start
```

| URL | Purpose |
|-----|---------|
| http://localhost:3001/api | REST API |
| http://localhost:3001/docs | Swagger UI |

There is **no seed script**. Data is created through the app or API.

### Applying migrations

| Command | When to use |
|---------|-------------|
| `npm run db:migrate` | Development — creates and applies new migrations |
| `npx prisma migrate deploy` | Apply pending migrations without reset (e.g. when `migrate dev` warns about modified history) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with hot reload (listens on `0.0.0.0` by default) |
| `npm run build` | `prisma generate` + Nest build |
| `npm run start:prod` | Run compiled app |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Unit tests (Jest configured; add specs as needed) |

## Database

- **ORM:** Prisma 7 with `@prisma/adapter-pg`
- **Schema:** `prisma/schema.prisma`
- **Migrations:** `prisma/migrations/`
- **Generated client:** `src/generated/prisma`

### Migrations

Applied in order under `prisma/migrations/`:

| Migration | Adds |
|-----------|------|
| `20260523031217_init` | Categories, transactions |
| `20260523031810_add_sub_categories` | Sub-categories |
| `20260523032934_add_accounts` | Accounts (+ three default rows: Cash, Kotak, HDFC) |
| `20260523033950_add_transfer_type` | Transfer transaction type, `toAccountId` |
| `20260523095212_add_recurring_transactions` | Recurring templates |
| `20260523100821_add_transaction_cleared` | `cleared` flag for reconciliation |
| `20260523102454_add_transaction_splits` | Split lines on transactions |
| `20260523103451_add_category_budgets` | Monthly expense budgets |
| `20260523120000_add_account_initial_balance` | `initialBalance` snapshot field |
| `20260523140000_add_account_tracking_start_date` | `trackingStartDate` (balance-as-of) |
| `20260523160000_add_transaction_tags` | Tags and transaction–tag links |

There is no runtime seed — only the one-time account inserts in `add_accounts` on fresh databases. Categories and tags are user-created.

### Models

| Model | Purpose |
|-------|---------|
| **Account** | name, type (`CASH` \| `BANK` \| `OTHER`), `balance`, `initialBalance`, `trackingStartDate`, color |
| **Category** | name, type (`INCOME` \| `EXPENSE` \| `INVESTMENT`), color, icon |
| **SubCategory** | name, belongs to one category |
| **Transaction** | amount, type, date, description, notes, `cleared`; links to account(s), category, splits, tags |
| **TransactionSplit** | Split lines on a transaction (category, sub-category, amount) |
| **Tag** | name (unique), color |
| **TransactionTag** | Many-to-many link between transactions and tags |
| **RecurringTransaction** | Monthly template with `dayOfMonth`, `active`, `lastPostedYear/Month` |
| **CategoryBudget** | Monthly budget per expense category (`year`, `month`, `amount`) |

### Account snapshot fields

| Field | Role |
|-------|------|
| `initialBalance` | Stored starting balance on `trackingStartDate` |
| `balance` | Live balance — updated by every transaction |
| `trackingStartDate` | Balance-as-of date; drives which months have statement data |

When updating `initialBalance` or `trackingStartDate` on an account **with existing transactions**, only the stored snapshot changes — `balance` is not reset. Balance-as-of date must be on or before the earliest transaction on that account.

### Balance logic

Implemented in `src/transactions/transactions.service.ts` and `src/common/account-balance-effect.ts`:

- **Income** → increment account balance
- **Expense / Investment** → decrement account balance
- **Transfer** → decrement source, increment destination

Creates, updates, and deletes use row locking (`FOR UPDATE`) on affected accounts. Updates and deletes reverse the old effect before applying the new one. Toggling **`cleared`** alone does **not** change balances.

Transaction dates are validated against each affected account’s `trackingStartDate`.

### Tags

- `TagsService` (`src/tags/`) — CRUD; `ensureTagIdsExist()` validates IDs on transaction create/update
- `TransactionsService` syncs `tagIds` via `TransactionTag` join rows
- List filter: `GET /transactions?tagId=...`
- Tags do not affect account balances

### Monthly account balances

`GET /api/accounts/balance-summary?year=&month=` computes per account:

- **Opening** — calendar opening (1st of month) or balance-as-of snapshot when tracking started mid-month
- **Closing** — balance at month end, or through today for the current month
- **Activity breakdown** — income, expenses, investments, transfers in/out (from transaction dates)
- **Portfolio totals** — opening on 1st, mid-month additions, closing, net change

Logic lives in `src/common/account-balance-summary.ts`. Statement visibility uses **`trackingStartDate`**, not `createdAt`.

`GET /api/accounts/balance-trend?year=` returns total closing balance per month (net worth trend).

### Reports

`ReportsService` (`src/reports/reports.service.ts`) builds a unified overview:

**Preset mode** — `year`, `month`, `range` (`6m` \| `12m` \| `ytd`):

- Month sequence ending at the selected month
- Cash flow, category totals/monthly/sub-category, tag totals, net worth points, budget hit rates

**Custom mode** — `fromDate`, `toDate`:

- Calendar date range converted to month buckets (max **24 months**)
- Same response shape with `periodMode: 'custom'`, `range: 'custom'`

Tag totals split each non-transfer transaction amount evenly across its tags.

### Category allocations

Split transactions use `src/common/category-allocations.ts` for:

- Monthly summaries
- Budget actuals
- Investment and rental income aggregation
- Reports category breakdown

### Dates

Calendar dates are stored as PostgreSQL `DATE`. Parsing and month boundaries use UTC helpers in `src/common/date-utils.ts` to avoid timezone off-by-one errors (e.g. IST).

Reports month sequences: `getReportsMonthSequence()`, `getReportsMonthSequenceFromDateRange()`.

## Security

- **`API_KEY`** — optional in development; required in production. When set, `ApiKeyGuard` validates `x-api-key` with timing-safe comparison.
- **CORS** — `FRONTEND_URL` plus private LAN IPs on port 3000 in development (`src/common/network-utils.ts`).
- **No user accounts** — single shared database; API key is the only access control when enabled.

## API modules

| Module | Path prefix |
|--------|-------------|
| Accounts | `/api/accounts` |
| Categories | `/api/categories` |
| Transactions | `/api/transactions` |
| Recurring transactions | `/api/recurring-transactions` |
| Budgets | `/api/budgets` |
| Reports | `/api/reports` |
| Tags | `/api/tags` |

Global validation uses `class-validator` with whitelist and transform enabled.

### Notable endpoints

```
GET  /api/accounts/balance-summary?year=2026&month=5
GET  /api/accounts/balance-trend?year=2026
GET  /api/accounts/:id/reconciliation
POST /api/accounts                    # { trackingStartDate, initialBalance?, ... }
GET  /api/transactions?search=...&fromDate=...&toDate=...&tagId=...
POST /api/transactions                # body may include splits[], tagIds[]
PATCH /api/transactions/:id           # body may include tagIds[], cleared, splits[]
POST /api/recurring-transactions/:id/post   # { year, month }
GET  /api/budgets/overview?year=2026&month=5
PUT  /api/budgets/sync                # { year, month, budgets[] }
GET  /api/reports/overview?year=2026&month=5&range=12m
GET  /api/reports/overview?fromDate=2026-01-01&toDate=2026-05-31
GET  /api/tags
POST /api/tags                        # { name, color? }
PATCH /api/tags/:id
DELETE /api/tags/:id
```

### Delete guards

- **Account** — blocked if referenced by transactions or recurring items
- **Category** — blocked if used by transactions, splits, budgets, or recurring items; type changes guarded similarly
- **Tag** — delete cascades `TransactionTag` links only

## Environment

See `.env.example`:

```env
DATABASE_URL="postgresql://alpha:alpha_secret@localhost:5432/alpha_ledger?schema=public"
PORT=3001
FRONTEND_URL="http://localhost:3000"
# HOST=0.0.0.0          # dev default; production uses 127.0.0.1
# API_KEY=your-secret-key
```

Your local `.env` may use a different database name (e.g. `alpha_ledger_app`) if you created one manually. It must match a database that exists in Postgres.

## Source layout

```
src/
├── accounts/
├── budgets/
├── categories/
├── common/
│   ├── api-key.guard.ts
│   ├── account-balance-effect.ts
│   ├── account-balance-summary.ts
│   ├── category-allocations.ts
│   ├── date-utils.ts
│   └── network-utils.ts
├── prisma/
├── recurring-transactions/
├── reports/
│   ├── reports.controller.ts
│   ├── reports.service.ts
│   └── dto/
├── tags/
│   ├── tags.controller.ts
│   ├── tags.service.ts
│   └── dto/
└── transactions/
    ├── transactions.controller.ts
    ├── transactions.service.ts
    └── dto/
```

## Testing

Jest is configured in `package.json`. There are no unit tests yet — add coverage for balance updates, transfers, splits, recurring post, and reconciliation before large refactors.

The e2e test in `test/app.e2e-spec.ts` may be stale (expects Nest default root); update it if you enable e2e in CI.

Project overview: [../README.md](../README.md)
