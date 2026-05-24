import { formatCurrency, MONTH_NAMES } from "@/lib/format";
import { getReportsPeriodLabel } from "@/lib/reports-format";
import { ReportsOverview } from "@/types";
import { downloadCsvFile } from "@/lib/export-transactions-csv";

function escapeCsvCell(value: string): string {
  const needsFormulaGuard = /^[=+\-@\t\r]/.test(value);
  const safe = needsFormulaGuard ? `'${value}` : value;

  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }

  return safe;
}

function row(cells: string[]): string {
  return cells.map(escapeCsvCell).join(",");
}

function sectionTitle(title: string): string {
  return row([title]);
}

export function buildReportsCsv(overview: ReportsOverview): string {
  const lines: string[] = [];
  const periodLabel = getReportsPeriodLabel(overview);

  lines.push(sectionTitle("Alpha Ledger report"));
  lines.push(row(["Period", periodLabel]));
  lines.push("");

  lines.push(sectionTitle("Cash flow summary"));
  lines.push(row(["Metric", "Amount"]));

  const cashTotals = overview.cashFlow.reduce(
    (acc, point) => ({
      income: acc.income + point.income,
      expenses: acc.expenses + point.expenses,
      investments: acc.investments + point.investments,
      netSavings: acc.netSavings + point.netSavings,
    }),
    { income: 0, expenses: 0, investments: 0, netSavings: 0 },
  );

  lines.push(row(["Total income", String(cashTotals.income)]));
  lines.push(row(["Total expenses", String(cashTotals.expenses)]));
  lines.push(row(["Total investments", String(cashTotals.investments)]));
  lines.push(row(["Net savings", String(cashTotals.netSavings)]));
  lines.push("");

  lines.push(sectionTitle("Cash flow by month"));
  lines.push(row(["Year", "Month", "Income", "Expenses", "Investments", "Net savings"]));
  for (const point of overview.cashFlow) {
    lines.push(
      row([
        String(point.year),
        MONTH_NAMES[point.month - 1] ?? String(point.month),
        String(point.income),
        String(point.expenses),
        String(point.investments),
        String(point.netSavings),
      ]),
    );
  }
  lines.push("");

  lines.push(sectionTitle("Category totals"));
  lines.push(row(["Category", "Type", "Total", "Count"]));
  for (const item of overview.categories.totals) {
    lines.push(
      row([item.categoryName, item.type, String(item.total), String(item.count)]),
    );
  }
  lines.push("");

  if (overview.tags.length > 0) {
    lines.push(sectionTitle("Tag totals"));
    lines.push(row(["Tag", "Total", "Count"]));
    for (const item of overview.tags) {
      lines.push(row([item.tagName, String(item.total), String(item.count)]));
    }
    lines.push("");
  }

  lines.push(sectionTitle("Net worth by month"));
  lines.push(row(["Year", "Month", "Closing balance", "Net change"]));
  for (const point of overview.netWorth) {
    lines.push(
      row([
        String(point.year),
        MONTH_NAMES[point.month - 1] ?? String(point.month),
        String(point.totalClosing),
        String(point.netChange),
      ]),
    );
  }
  lines.push("");

  if (overview.budgets.length > 0) {
    lines.push(sectionTitle("Budget performance"));
    lines.push(
      row([
        "Year",
        "Month",
        "Budget total",
        "Spent total",
        "Categories with budget",
        "On track",
        "Hit rate %",
      ]),
    );
    for (const item of overview.budgets) {
      lines.push(
        row([
          String(item.year),
          MONTH_NAMES[item.month - 1] ?? String(item.month),
          String(item.budgetTotal),
          String(item.spentTotal),
          String(item.categoriesWithBudget),
          String(item.categoriesOnTrack),
          item.hitRate === null ? "" : String(item.hitRate),
        ]),
      );
    }
  }

  return lines.join("\r\n");
}

export function buildReportsExportFilename(overview: ReportsOverview): string {
  if (overview.periodMode === "custom" && overview.fromDate && overview.toDate) {
    const from = overview.fromDate.split("T")[0]!;
    const to = overview.toDate.split("T")[0]!;
    return `alpha-ledger-report-${from}-to-${to}.csv`;
  }

  const monthPart = String(overview.month).padStart(2, "0");
  return `alpha-ledger-report-${overview.year}-${monthPart}-${overview.range}.csv`;
}

export function exportReportsToCsv(overview: ReportsOverview) {
  const content = buildReportsCsv(overview);
  const filename = buildReportsExportFilename(overview);
  downloadCsvFile(filename, content);
}

export function formatReportsPrintCurrency(value: number): string {
  return formatCurrency(value);
}
