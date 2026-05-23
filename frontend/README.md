# Alpha Ledger — Frontend

Next.js app for the Alpha Ledger personal finance tracker.

## Setup

From the repo root, start the backend first (see [../README.md](../README.md)), then:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | Backend API base URL |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — monthly stats, charts, recent transactions |
| `/transactions` | Transaction list and add/edit dialog |
| `/accounts` | Account management and balances |
| `/categories` | Categories and sub-categories |
| `/rental-income` | Rental income by sub-category |
| `/investments` | Investment summary and transactions |

## Key directories

```
src/
├── app/                 # App Router pages
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── layout/          # Shell, sidebar, navigation
│   ├── transactions/    # Form, table, type selector
│   ├── dashboard/       # Charts and summary cards
│   └── …
├── lib/
│   ├── api.ts           # Fetch wrapper for backend
│   └── format.ts        # INR formatting, date helpers, labels
└── types/               # Shared TypeScript types
```

## UI notes

- Dark theme by default via `next-themes`
- Dates: DD/MM/YYYY text input + calendar popover (`components/shared/date-input.tsx`)
- Add transaction: type selector cards, centered ₹ amount, scrollable dialog with fixed footer
- Toast notifications via Sonner

## Agent / IDE rules

See `AGENTS.md` for Next.js version-specific notes when using AI coding assistants.
