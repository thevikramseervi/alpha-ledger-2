# Alpha Ledger — Frontend

Next.js app for the Alpha Ledger personal finance tracker.

## Setup

Start the backend first (see [../README.md](../README.md)), then:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run frontend and backend in **separate terminals** to reduce CPU load on first compile.

Dev server binds to **`0.0.0.0`** so you can open the app from other devices on your LAN using your machine’s IP address.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | Backend API base URL |
| `NEXT_PUBLIC_API_KEY` | — | Must match backend `API_KEY` when API is protected |
| `DEV_ALLOWED_ORIGINS` | — | Comma-separated hostnames for HMR on LAN/hotspot |

On LAN, the API client automatically targets port `3001` on the same host as the browser (unless you are on `localhost`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (Turbopack, `--hostname 0.0.0.0`) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — KPI cards with MoM/YoY, net worth, cash flow (6M/12M/YTD), budgets, category donut, recent transactions, recurring nudge |
| `/reports` | Reports — cash flow, categories, tags, net worth, budgets; preset or custom range; CSV + print export |
| `/transactions` | Transaction list, filters (incl. tag), CSV export, due-only recurring banner |
| `/recurring` | Recurring templates — create, edit, activate/deactivate, post for month |
| `/accounts` | Monthly statements, balance charts, account CRUD |
| `/accounts/[id]/reconcile` | Bank reconciliation for one account |
| `/categories` | Categories and sub-categories |
| `/tags` | Transaction tags — create, edit, delete |
| `/rental-income` | Rental income by sub-category |
| `/investments` | Investment cash-flow summary with donut chart |

There is no `/dashboard` route — the dashboard is the home page (`/`).

## Navigation

Shared nav config: `components/layout/nav-items.ts` (used by desktop sidebar and mobile sheet menu).

## Key features by area

### Dashboard (`components/dashboard/`)

| Component | Purpose |
|-----------|---------|
| `dashboard-page-client.tsx` | Month picker, parallel data load, partial-failure warnings |
| `stats-cards.tsx` | KPI cards (incl. savings rate) with vs last month / vs last year; links to filtered transactions |
| `chart-range-toggle.tsx` | Shared 6M / 12M / YTD toggle |
| `net-worth-section.tsx` | Total balance + area chart; optional range description override |
| `monthly-chart.tsx` | Cash flow — income, expenses, investments, net savings |
| `category-breakdown.tsx` | Donut chart + spending list |
| `category-budgets-card.tsx` | Budget progress + manage dialog |
| `rental-income-summary-card.tsx` | Rental summary when configured |
| `recent-transactions.tsx` | Latest transactions for selected month |

Shared analytics helpers: `src/lib/dashboard-analytics.ts`.

### Reports (`components/reports/`)

| Component | Purpose |
|-----------|---------|
| `reports-page-client.tsx` | Preset vs custom range, export CSV, print/PDF, tabbed layout |
| `reports-cash-flow-tab.tsx` | Period totals, cash flow chart, monthly net savings list |
| `reports-categories-tab.tsx` | Top categories, trends, sub-category drill-down, stacked bars |
| `reports-tags-tab.tsx` | Tag breakdown donut and list |
| `reports-net-worth-tab.tsx` | Net worth trend + account allocation |
| `reports-budgets-tab.tsx` | Budget hit rate and monthly budget vs spent |

Export/print: `src/lib/export-reports-csv.ts`, `src/lib/print-reports.ts`, `src/lib/reports-format.ts`.

### Recurring (`components/recurring/`)

| Component | Purpose |
|-----------|---------|
| `recurring-page-client.tsx` | Full template management page (`/recurring`) |
| `recurring-templates-panel.tsx` | CRUD list with post-for-month actions |
| `recurring-due-banner.tsx` | Slim due-only banner on Transactions (not full panel) |
| `recurring-review-sheet.tsx` | Review and post pending items |
| `recurring-dashboard-nudge.tsx` | Dashboard link when items are due |

### Transactions (`components/transactions/`)

| Component | Purpose |
|-----------|---------|
| `transactions-page-client.tsx` | Wrapped in `Suspense`; reads `year`, `month`, `type`, `recurring=review` from URL |
| `transaction-filters.tsx` | Search, month, type, account, category, tag, date range, CSV export |
| `transaction-form.tsx` | Split editor, tag picker, balance-as-of aware account picks |
| `transaction-tag-picker.tsx` | Multi-select tag chips on transaction form |
| `transaction-table.tsx` | Split badge, tag badges under description |
| `transaction-split-editor.tsx` | Multi-line category splits |

### Tags (`components/tags/`)

| Component | Purpose |
|-----------|---------|
| `tags-page-client.tsx` | Tag CRUD (name + color) |

### Categories (`components/categories/`)

| Component | Purpose |
|-----------|---------|
| `categories-page-client.tsx` | Category and sub-category CRUD, type filter |

### Accounts (`components/accounts/`)

| Component | Purpose |
|-----------|---------|
| `accounts-page-client.tsx` | Balance-as-of form field, roll-forward statements, month picker |
| `account-balance-chart.tsx` | Donut + bar chart of closing balances |
| `account-reconcile-page-client.tsx` | Cleared toggle, statement balance match |

### Investments (`components/investments/`)

Investment summary page — category/sub-category breakdown for investment **cash outflows** (not holdings).

### Shared (`components/shared/`)

| Component | Purpose |
|-----------|---------|
| `allocation-donut-chart.tsx` | Reusable Recharts donut with legend |
| `month-picker.tsx` | Shared month navigation |
| `date-input.tsx` | DD/MM/YYYY + calendar popover |
| `async-state.tsx` | Loading and error states |

## Key directories

```
src/
├── app/                 # App Router pages (thin wrappers → *-page-client.tsx)
├── components/
│   ├── ui/              # shadcn/ui primitives (Base UI Select, etc.)
│   ├── layout/          # Shell, sidebar, mobile nav
│   ├── dashboard/
│   ├── reports/
│   ├── transactions/
│   ├── recurring/
│   ├── tags/
│   ├── categories/
│   ├── accounts/
│   ├── investments/
│   └── shared/
├── lib/
│   ├── api.ts           # Typed fetch wrapper (API key, LAN host detection)
│   ├── api-error.ts     # Sanitized error logging and toasts
│   ├── chart-theme.ts   # Recharts colors and tooltip styles
│   ├── dashboard-analytics.ts  # Chart range, MoM/YoY, month shifting
│   ├── export-transactions-csv.ts  # Transaction CSV (tags column, formula guard)
│   ├── export-reports-csv.ts       # Report summary CSV
│   ├── print-reports.ts            # Print / PDF via browser print dialog
│   ├── reports-format.ts           # Report period labels
│   ├── format.ts        # INR formatting, date helpers, labels
│   ├── reconciliation.ts
│   ├── recurring-transactions.ts
│   └── validation.ts    # Input limits and trim helpers
└── types/               # Shared TypeScript types (incl. Tag, ReportsOverview)
```

## API client (`src/lib/api.ts`)

Typed methods for all backend resources. Notable:

- `api.transactions.list({ tagId, fromDate, toDate, ... })`
- `api.transactions.create/update` — pass `tagIds?: string[]`
- `api.reports.overview({ year, month, range })` or `{ fromDate, toDate }`
- `api.tags.list/create/update/delete`

## UI notes

- Dark theme by default (`app/layout.tsx`)
- Dates: DD/MM/YYYY text input + calendar popover (`components/shared/date-input.tsx`)
- Select fields use render functions on `SelectValue` to show names, not raw IDs
- Add transaction: type selector cards, centered ₹ amount, scrollable dialog with fixed footer
- Toast notifications via Sonner
- Destructive actions (delete account, category, tag, transaction) use confirmation dialogs
- Charts via **Recharts** (area, line, bar, pie)
- `suppressHydrationWarning` on `<html>` / `<body>` for browser extension attributes
- Reports **Print / PDF** opens a new window and triggers the browser print dialog (save as PDF from there)

## Troubleshooting

| Issue | Notes |
|-------|-------|
| Slow first compile | Normal on first `/` visit; backend + frontend together increases load |
| Hydration warning on Export button | Fixed via deferred disabled state in `transaction-filters.tsx` |
| Hydration warning on `<body>` | Usually a browser extension; suppressed in root layout |
| API errors on load | Backend or Postgres not running; check API key if set |
| Select shows ID after pick | `SelectValue` needs a label render function — see existing forms |
| LAN / phone access | Use `http://<laptop-ip>:3000`; set `DEV_ALLOWED_ORIGINS` if HMR fails |
| Print / PDF blocked | Allow pop-ups for localhost when using Reports print export |

## Agent / IDE rules

See [AGENTS.md](./AGENTS.md) for Next.js version-specific notes when using AI coding assistants.

Project overview: [../README.md](../README.md)
