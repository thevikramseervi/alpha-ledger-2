import { TRANSACTION_TYPE_LABELS, formatCategoryLabel } from "@/lib/format";
import { Transaction } from "@/types";

const CSV_HEADERS = [
  "Date",
  "Amount",
  "Type",
  "Category",
  "Sub-category",
  "Account",
  "To account",
  "Description",
  "Notes",
  "Tags",
] as const;

function escapeCsvCell(value: string): string {
  const needsFormulaGuard = /^[=+\-@\t\r]/.test(value);
  const safe = needsFormulaGuard ? `'${value}` : value;

  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }

  return safe;
}

function toCsvDate(isoDate: string): string {
  const datePart = isoDate.includes("T") ? isoDate.split("T")[0]! : isoDate;
  return datePart;
}

function transactionToRow(transaction: Transaction): string[] {
  const categoryLabel =
    transaction.splits && transaction.splits.length >= 2
      ? transaction.splits
          .map(
            (split) =>
              `${formatCategoryLabel(split.category.name, split.subCategory?.name)} (${Number(split.amount)})`,
          )
          .join("; ")
      : (transaction.category?.name ?? "");

  const subCategoryLabel =
    transaction.splits && transaction.splits.length >= 2
      ? ""
      : (transaction.subCategory?.name ?? "");

  return [
    toCsvDate(transaction.date),
    String(Number(transaction.amount)),
    TRANSACTION_TYPE_LABELS[transaction.type],
    categoryLabel,
    subCategoryLabel,
    transaction.account.name,
    transaction.toAccount?.name ?? "",
    transaction.description,
    transaction.notes ?? "",
    transaction.tags?.map((link) => link.tag.name).join("; ") ?? "",
  ];
}

export function buildTransactionsCsv(transactions: Transaction[]): string {
  const sorted = [...transactions].sort((a, b) => {
    const dateCompare = toCsvDate(a.date).localeCompare(toCsvDate(b.date));
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });

  const lines = [
    CSV_HEADERS.join(","),
    ...sorted.map((transaction) =>
      transactionToRow(transaction).map(escapeCsvCell).join(","),
    ),
  ];

  return lines.join("\r\n");
}

interface ExportFilenameOptions {
  year: number;
  month: number;
  fromDate?: string;
  toDate?: string;
}

export function buildTransactionsExportFilename({
  year,
  month,
  fromDate,
  toDate,
}: ExportFilenameOptions): string {
  if (fromDate || toDate) {
    const from = fromDate ? toCsvDate(fromDate) : "start";
    const to = toDate ? toCsvDate(toDate) : "end";
    return `alpha-ledger-transactions-${from}-to-${to}.csv`;
  }

  const monthPart = String(month).padStart(2, "0");
  return `alpha-ledger-transactions-${year}-${monthPart}.csv`;
}

export function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  filenameOptions: ExportFilenameOptions,
) {
  const content = buildTransactionsCsv(transactions);
  const filename = buildTransactionsExportFilename(filenameOptions);
  downloadCsvFile(filename, content);
}
