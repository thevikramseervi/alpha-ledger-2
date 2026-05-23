# Alpha Ledger — Backend

NestJS REST API with Prisma and PostgreSQL.

## Setup

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed    # optional
npm run start:dev
```

| URL | Purpose |
|-----|---------|
| http://localhost:3001/api | REST API |
| http://localhost:3001/docs | Swagger UI |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with hot reload |
| `npm run build` | `prisma generate` + Nest build |
| `npm run start:prod` | Run compiled app |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed default accounts and categories |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Unit tests |

## Database

- **ORM:** Prisma 7 with `@prisma/adapter-pg`
- **Schema:** `prisma/schema.prisma`
- **Migrations:** `prisma/migrations/`
- **Seed:** `prisma/seed.ts` (configured in `prisma.config.ts`)

### Models

- **Account** — name, type (`CASH` \| `BANK` \| `OTHER`), balance, color
- **Category** — name, type (`INCOME` \| `EXPENSE` \| `INVESTMENT`), color, icon
- **SubCategory** — name, belongs to one category
- **Transaction** — amount, type, date, description, notes; links to account(s) and optional category/sub-category

### Balance logic

Implemented in `src/transactions/transactions.service.ts`:

- **Income** → increment account balance
- **Expense / Investment** → decrement account balance
- **Transfer** → decrement source, increment destination

Updates and deletes reverse the old effect before applying the new one.

### Dates

Calendar dates are stored as PostgreSQL `DATE`. Parsing and month boundaries use UTC helpers in `src/common/date-utils.ts` to avoid timezone off-by-one errors (e.g. IST).

## API modules

| Module | Path prefix |
|--------|-------------|
| Accounts | `/api/accounts` |
| Categories | `/api/categories` |
| Transactions | `/api/transactions` |

Global validation uses `class-validator` with whitelist and transform enabled.

## Environment

See `.env.example`:

```env
DATABASE_URL="postgresql://alpha:alpha_secret@localhost:5432/alpha_ledger?schema=public"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

Ensure Docker Postgres is running (`docker compose up -d` from repo root) before migrating.
