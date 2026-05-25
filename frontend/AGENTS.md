<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Alpha Ledger frontend — agent notes

## Project docs

- [../README.md](../README.md) — full product overview, API summary, setup
- [README.md](./README.md) — frontend pages, components, lib layout
- [../backend/README.md](../backend/README.md) — schema, migrations, backend modules

## Stack

- Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui (Base UI), Recharts
- All feature pages use `"use client"` `*-page-client.tsx` components
- INR formatting hardcoded in `src/lib/format.ts` (`en-IN`)

## API client

- `src/lib/api.ts` — typed methods; respects `NEXT_PUBLIC_API_KEY`
- LAN: auto-targets port `3001` on same host as browser (unless `localhost`)
- Reports: `api.reports.overview({ year, month, range })` or `{ fromDate, toDate }`
- Reports PDF: `api.reports.exportPackage(...)` — same params as overview; returns `ReportsExportPackage`
- Tags: `api.tags.*`; transactions accept `tagIds` on create/update, filter by `tagId`

## UI conventions

- **Select components:** Base UI `SelectValue` shows raw values unless you pass a `(value) => label` render child
- **Dates:** UTC calendar dates via `src/lib/format.ts` — do not use local `Date` parsing for transaction dates
- **Charts:** shared colors in `src/lib/chart-theme.ts`; donuts via `allocation-donut-chart.tsx`
- **Chart range:** `DashboardChartRange` = `'6m' | '12m' | 'ytd'` in `dashboard-analytics.ts`; reports also support custom dates via API
- **Navigation:** shared `components/layout/nav-items.ts` — used by sidebar and mobile sheet
- **Mobile web app / offline:** `app/manifest.ts`, `app/icon.tsx`, `app/apple-icon.tsx`, `app/pwa-icon/route.tsx`, `public/sw.js`, and `components/pwa/*` provide Add-to-Home-Screen support plus offline read caching; keep icons, manifest, and service-worker behavior aligned

## Domain rules (do not break)

- **No seed script:** fresh DBs get three default accounts from `add_accounts` migration only; categories and tags are user-created
- **Account snapshots:** `initialBalance` + `trackingStartDate` drive monthly statements; editing them after transactions exist does not reset live `balance`
- **Single-entry cash flow:** not double-entry; categories classify reporting; tags are optional labels
- **Transfers:** no category; two accounts required
- **Splits:** non-transfer only; amounts must sum to transaction total
- **Cleared flag:** reconciliation only; does not change balances
- **Transaction date:** must be ≥ each affected account’s `trackingStartDate`

## URL-driven behavior

- Dashboard stat cards → `/transactions?year=&month=&type=`
- Recurring review → `/transactions?recurring=review`
- Transactions page uses `useSearchParams` inside `Suspense`

## Recurring UX

- Full CRUD on `/recurring`
- Transactions page shows **due-only banner** + review sheet — not the full recurring panel
- Dashboard nudge when items are pending for selected month

## Export

- Transactions CSV: `export-transactions-csv.ts` (includes Tags column, formula-injection guard)
- Reports CSV: `export-reports-csv.ts` (overview summary tables only)
- Reports PDF: `src/lib/reports-pdf/` (`@react-pdf/renderer`)
  - Entry: `downloadReportsPdfFromParams(params, { mode: 'full' | 'summary', onProgress })`
  - Document: `ReportsPdfDocument` in `reports-pdf-document.tsx`
  - Fonts: Inter registered in `pdf-fonts.ts` (CDN); call `registerPdfFonts()` before render
- Reports XLSX: `src/lib/reports-xlsx/` (`xlsx` / SheetJS)
  - Entry: `downloadReportsXlsxFromParams(params, { onProgress })`
  - Builder: `buildReportsWorkbook()` in `build-reports-xlsx.ts` — multi-sheet full export
- Shared export fetch: `src/lib/reports-export/fetch-export-package.ts` → `api.reports.exportPackage(...)`
  - Backend must expose `rentalIncomePeriod` and `investmentSummaryPeriod` on export package
- Offline policy: cache navigations and read-only GET API responses; do **not** queue or replay finance mutations offline unless the product explicitly changes

## Dev server

```bash
npm run dev   # --hostname 0.0.0.0 for LAN
```

## When changing docs

Update together: `../README.md`, `../backend/README.md`, `frontend/README.md`, and this file if agent-relevant conventions change.
