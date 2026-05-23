# Alpha Ledger

A personal finance web app for tracking **income**, **expenses**, **investments**, and **transfers** across multiple accounts. Built for day-to-day money management with monthly dashboards, category breakdowns, rental income views, and investment summaries.

Currency and formatting default to **INR (`en-IN`)**.

> **Note:** This is a cash-flow tracker with account balances, not a full double-entry accounting system. Categories are labels for reporting; only **transfers** move money between two of your accounts in one transaction.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts |
| Backend | NestJS 11, Prisma 7, class-validator, Swagger |
| Database | PostgreSQL 16 (Docker) |

## Features

### Dashboard (`/`)
- Monthly income, expenses, investments, and net savings
- Yearly cash-flow chart
- Category breakdown and recent transactions
- Rental income summary card (when configured)

### Transactions (`/transactions`)
- Create, edit, and delete transactions
- Filter by month and type
- Types: **Income**, **Expense**, **Investment**, **Transfer**
- Modern add/edit form with type cards and centered amount input
- DD/MM/YYYY date entry with calendar picker

### Accounts (`/accounts`)
- Cash, bank, and other accounts with running balances
- Balances update automatically when transactions are added or changed

### Categories (`/categories`)
- Full CRUD for income, expense, and investment categories
- Sub-categories per category (e.g. Food → Groceries)
- Filter categories by type

### Rental income (`/rental-income`)
- Summary for the category named **Rental Income** (case-insensitive)
- Groups income by sub-category (e.g. per house or shop)

### Investments (`/investments`)
- All investment transactions with optional account filter
- Breakdown by category and sub-category (month + year-to-date)

## Getting started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- npm

### 1. Start PostgreSQL

```bash
docker compose up -d
```

Database: `alpha_ledger` · user `alpha` · password `alpha_secret` · port `5432`

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed    # optional — seeds default accounts and categories (no sample transactions)
npm run start:dev
```

- API: [http://localhost:3001/api](http://localhost:3001/api)
- Swagger: [http://localhost:3001/docs](http://localhost:3001/docs)

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)

### Run everything from the repo root

```bash
npm install
npm run db:up
npm run db:migrate
npm run db:seed    # optional
npm run dev        # starts backend + frontend concurrently
```

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API port (default `3001`) |
| `FRONTEND_URL` | CORS origin (default `http://localhost:3000`) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (default `http://localhost:3001/api`) |

## API overview

All routes are prefixed with `/api`.

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions` | List (filter: `year`, `month`, `type`, `categoryId`, `accountId`) |
| POST | `/transactions` | Create |
| GET | `/transactions/:id` | Get one |
| PATCH | `/transactions/:id` | Update |
| DELETE | `/transactions/:id` | Delete |
| GET | `/transactions/summary/monthly` | Monthly dashboard stats |
| GET | `/transactions/summary/yearly` | Yearly trend |
| GET | `/transactions/summary/rental-income` | Rental income summary |
| GET | `/transactions/summary/investments` | Investment summary |

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts` | List all |
| POST | `/accounts` | Create |
| GET | `/accounts/:id` | Get one |
| PATCH | `/accounts/:id` | Update |
| DELETE | `/accounts/:id` | Delete |

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

## Transaction rules

| Type | Category required? | Account effect |
|------|-------------------|----------------|
| Income | Yes | Selected account balance **increases** |
| Expense | Yes | Selected account balance **decreases** |
| Investment | Yes | Selected account balance **decreases** (cash out) |
| Transfer | No | Source account **decreases**, destination **increases** |

Transfers require **from** and **to** accounts (must be different).

## Seed data

Running `npm run db:seed` (from root or backend) upserts:

- **Accounts:** Cash, Kotak Savings, HDFC Savings, Zerodha
- **Categories:** Salary, Groceries, Rental Income, Mutual Funds, etc.
- **Sub-categories:** e.g. Groceries → Dairy, Transport → Fuel

It does **not** insert sample transactions. Safe to re-run; it will not wipe your existing transactions.

## Project structure

```
alpha-ledger-2/
├── backend/
│   ├── prisma/           # Schema, migrations, seed
│   └── src/
│       ├── accounts/
│       ├── categories/
│       ├── transactions/
│       └── common/       # Date utilities (UTC calendar dates)
├── frontend/
│   └── src/
│       ├── app/          # Pages (dashboard, transactions, …)
│       ├── components/
│       └── lib/          # API client, formatting (INR)
├── docker-compose.yml
└── package.json          # Root scripts (dev, db:*)
```

## Useful commands

```bash
# Root
npm run dev              # Backend + frontend
npm run db:up            # Start Postgres
npm run db:down          # Stop Postgres
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed accounts & categories

# Backend
npm run start:dev --prefix backend
npm run db:studio --prefix backend   # Prisma Studio

# Frontend
npm run dev --prefix frontend
npm run build --prefix frontend
```

## Further reading

- [backend/README.md](./backend/README.md) — API and database development
- [frontend/README.md](./frontend/README.md) — UI development
