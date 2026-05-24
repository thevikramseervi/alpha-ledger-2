import { formatCurrency, MONTH_NAMES } from "@/lib/format";
import { getReportsPeriodLabel } from "@/lib/reports-format";
import { ReportsOverview } from "@/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTable(headers: string[], rows: string[][]): string {
  const head = headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function buildReportsPrintHtml(overview: ReportsOverview): string {
  const periodLabel = getReportsPeriodLabel(overview);

  const cashTotals = overview.cashFlow.reduce(
    (acc, point) => ({
      income: acc.income + point.income,
      expenses: acc.expenses + point.expenses,
      investments: acc.investments + point.investments,
      netSavings: acc.netSavings + point.netSavings,
    }),
    { income: 0, expenses: 0, investments: 0, netSavings: 0 },
  );

  const cashFlowRows = overview.cashFlow.map((point) => [
    String(point.year),
    MONTH_NAMES[point.month - 1] ?? String(point.month),
    formatCurrency(point.income),
    formatCurrency(point.expenses),
    formatCurrency(point.investments),
    formatCurrency(point.netSavings),
  ]);

  const categoryRows = overview.categories.totals.map((item) => [
    item.categoryName,
    item.type,
    formatCurrency(item.total),
    String(item.count),
  ]);

  const tagRows = overview.tags.map((item) => [
    item.tagName,
    formatCurrency(item.total),
    String(item.count),
  ]);

  const netWorthRows = overview.netWorth.map((point) => [
    String(point.year),
    MONTH_NAMES[point.month - 1] ?? String(point.month),
    formatCurrency(point.totalClosing),
    formatCurrency(point.netChange),
  ]);

  const budgetRows = overview.budgets.map((item) => [
    String(item.year),
    MONTH_NAMES[item.month - 1] ?? String(item.month),
    formatCurrency(item.budgetTotal),
    formatCurrency(item.spentTotal),
    String(item.categoriesWithBudget),
    String(item.categoriesOnTrack),
    item.hitRate === null ? "—" : `${item.hitRate.toFixed(0)}%`,
  ]);

  const sections = [
    `<h1>Alpha Ledger report</h1><p class="meta">${escapeHtml(periodLabel)}</p>`,
    `<h2>Cash flow summary</h2>${buildTable(
      ["Metric", "Amount"],
      [
        ["Total income", formatCurrency(cashTotals.income)],
        ["Total expenses", formatCurrency(cashTotals.expenses)],
        ["Total investments", formatCurrency(cashTotals.investments)],
        ["Net savings", formatCurrency(cashTotals.netSavings)],
      ],
    )}`,
    `<h2>Cash flow by month</h2>${buildTable(
      ["Year", "Month", "Income", "Expenses", "Investments", "Net savings"],
      cashFlowRows,
    )}`,
    categoryRows.length > 0
      ? `<h2>Category totals</h2>${buildTable(
          ["Category", "Type", "Total", "Count"],
          categoryRows,
        )}`
      : "",
    tagRows.length > 0
      ? `<h2>Tag totals</h2>${buildTable(["Tag", "Total", "Count"], tagRows)}`
      : "",
    netWorthRows.length > 0
      ? `<h2>Net worth by month</h2>${buildTable(
          ["Year", "Month", "Closing balance", "Net change"],
          netWorthRows,
        )}`
      : "",
    budgetRows.length > 0
      ? `<h2>Budget performance</h2>${buildTable(
          [
            "Year",
            "Month",
            "Budget total",
            "Spent total",
            "Categories with budget",
            "On track",
            "Hit rate",
          ],
          budgetRows,
        )}`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Alpha Ledger report</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 1.5rem; margin: 0 0 4px; }
    h2 { font-size: 1.1rem; margin: 24px 0 8px; }
    .meta { color: #555; margin: 0 0 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 0.9rem; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; }
    td:last-child, th:last-child { text-align: right; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  ${sections}
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
}

export function printReportsOverview(overview: ReportsOverview) {
  const html = buildReportsPrintHtml(overview);
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");

  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups to print this report.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
