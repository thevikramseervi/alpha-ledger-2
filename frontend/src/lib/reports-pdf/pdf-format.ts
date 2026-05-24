import {
  formatCategoryLabel,
  formatCurrency,
  formatDate,
  MONTH_NAMES,
  MONTH_SHORT,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/format';
import { getReportsPeriodLabel } from '@/lib/reports-format';
import { pdfStyles } from '@/lib/reports-pdf/pdf-styles';
import { AccountBalanceSummary, ReportsExportPackage, Transaction } from '@/types';

export function pdfPeriodLabel(data: ReportsExportPackage) {
  return getReportsPeriodLabel(data.overview);
}

export function pdfGeneratedLabel(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function pdfMonthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function pdfShortMonthLabel(year: number, month: number) {
  return `${MONTH_SHORT[month - 1]} '${String(year).slice(-2)}`;
}

export function pdfFilename(data: ReportsExportPackage, mode: 'full' | 'summary' = 'full') {
  const overview = data.overview;
  const suffix = mode === 'summary' ? '-summary' : '';
  if (overview.periodMode === 'custom' && overview.fromDate && overview.toDate) {
    const from = overview.fromDate.split('T')[0]!;
    const to = overview.toDate.split('T')[0]!;
    return `alpha-ledger-report-${from}-to-${to}${suffix}.pdf`;
  }
  const monthPart = String(overview.month).padStart(2, '0');
  return `alpha-ledger-report-${overview.year}-${monthPart}-${overview.range}${suffix}.pdf`;
}

export function pdfCashFlowTotals(data: ReportsExportPackage) {
  return data.overview.cashFlow.reduce(
    (acc, point) => ({
      income: acc.income + point.income,
      expenses: acc.expenses + point.expenses,
      investments: acc.investments + point.investments,
      netSavings: acc.netSavings + point.netSavings,
    }),
    { income: 0, expenses: 0, investments: 0, netSavings: 0 },
  );
}

export function pdfTransactionCategoryLabel(transaction: Transaction) {
  if (transaction.splits && transaction.splits.length >= 2) {
    return transaction.splits
      .map((split) =>
        formatCategoryLabel(split.category.name, split.subCategory?.name),
      )
      .join('; ');
  }
  return formatCategoryLabel(
    transaction.category?.name ?? '—',
    transaction.subCategory?.name,
  );
}

export function pdfTransactionTags(transaction: Transaction) {
  return transaction.tags?.map((link) => link.tag.name).join(', ') ?? '';
}

export function pdfMoney(value: number | string) {
  return formatCurrency(value);
}

export function pdfTxnTypeLabel(type: Transaction['type']) {
  return TRANSACTION_TYPE_LABELS[type];
}

export function pdfTxnDate(iso: string) {
  return formatDate(iso);
}

export function pdfPercent(value: number) {
  return `${value.toFixed(0)}%`;
}

export function pdfPeriodBalanceSummary(
  startSummary: AccountBalanceSummary | undefined,
  endSummary: AccountBalanceSummary | undefined,
) {
  if (!startSummary || !endSummary) {
    return null;
  }

  const opening = startSummary.totals.openingAtMonthStart;
  const closing = endSummary.totals.closing;
  const netChange = closing - opening;

  return {
    opening,
    closing,
    netChange,
    addedDuringPeriod: endSummary.totals.addedDuringPeriod,
    addedAccountCount: endSummary.totals.addedAccountCount,
    moneyIn: endSummary.totals.moneyIn,
    moneyOut: endSummary.totals.moneyOut,
  };
}

export function pdfBudgetPeriodTotals(data: ReportsExportPackage) {
  return data.overview.budgets.reduce(
    (acc, month) => ({
      budgetTotal: acc.budgetTotal + month.budgetTotal,
      spentTotal: acc.spentTotal + month.spentTotal,
      categoriesOnTrack: acc.categoriesOnTrack + month.categoriesOnTrack,
      categoriesWithBudget: acc.categoriesWithBudget + month.categoriesWithBudget,
    }),
    {
      budgetTotal: 0,
      spentTotal: 0,
      categoriesOnTrack: 0,
      categoriesWithBudget: 0,
    },
  );
}

export function pdfTxnAmountStyle(type: Transaction['type']) {
  switch (type) {
    case 'INCOME':
      return pdfStyles.amountIncome;
    case 'EXPENSE':
      return pdfStyles.amountExpense;
    case 'INVESTMENT':
      return pdfStyles.amountInvestment;
    case 'TRANSFER':
      return pdfStyles.amountTransfer;
    default:
      return undefined;
  }
}

export function pdfTopTrendCategories(data: ReportsExportPackage, limit = 6) {
  const spending = data.overview.categories.totals.filter(
    (item) => item.type === 'EXPENSE' || item.type === 'INVESTMENT',
  );
  return spending.slice(0, limit);
}

export function pdfCategoryTrendMatrix(data: ReportsExportPackage, limit = 6) {
  const categories = pdfTopTrendCategories(data, limit);
  const rows = data.overview.months.map((monthRef) => {
    const monthData = data.overview.categories.monthly.find(
      (entry) => entry.year === monthRef.year && entry.month === monthRef.month,
    );
    return {
      label: pdfShortMonthLabel(monthRef.year, monthRef.month),
      values: categories.map(
        (category) =>
          monthData?.totals.find((entry) => entry.categoryId === category.categoryId)
            ?.total ?? 0,
      ),
    };
  });

  return { categories, rows };
}

export function pdfSubCategoryGroups(data: ReportsExportPackage, limit = 6) {
  const topCategories = data.overview.categories.totals
    .filter((item) => item.type === 'EXPENSE')
    .slice(0, limit);

  return topCategories.map((category) => ({
    category,
    subCategories: data.overview.categories.subCategories
      .filter((item) => item.categoryId === category.categoryId)
      .slice(0, 8),
  }));
}
