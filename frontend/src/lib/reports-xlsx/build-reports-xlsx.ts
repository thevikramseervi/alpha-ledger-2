import {
  formatDate,
  MONTH_NAMES,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/format';
import { getReportsPeriodLabel } from '@/lib/reports-format';
import {
  pdfBudgetPeriodTotals,
  pdfCashFlowTotals,
  pdfCategoryTrendMatrix,
  pdfGeneratedLabel,
  pdfMonthLabel,
  pdfPeriodBalanceSummary,
  pdfShortMonthLabel,
  pdfTransactionCategoryLabel,
  pdfTransactionTags,
} from '@/lib/reports-pdf/pdf-format';
import { ReportsExportPackage, Transaction } from '@/types';
import * as XLSX from 'xlsx';

type Row = Array<string | number | boolean | null>;

function sheetName(name: string) {
  return name.replace(/[\\/*?:[\]]/g, '-').slice(0, 31);
}

function addSheet(workbook: XLSX.WorkBook, name: string, rows: Row[]) {
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName(name));
}

function blankRow(): Row {
  return [];
}

function sectionHeader(title: string): Row {
  return [title];
}

function txnTypeLabel(type: Transaction['type']) {
  return TRANSACTION_TYPE_LABELS[type];
}

function txnTags(transaction: Transaction) {
  return pdfTransactionTags(transaction);
}

export function xlsxFilename(data: ReportsExportPackage) {
  const overview = data.overview;
  if (overview.periodMode === 'custom' && overview.fromDate && overview.toDate) {
    const from = overview.fromDate.split('T')[0]!;
    const to = overview.toDate.split('T')[0]!;
    return `alpha-ledger-report-${from}-to-${to}.xlsx`;
  }
  const monthPart = String(overview.month).padStart(2, '0');
  return `alpha-ledger-report-${overview.year}-${monthPart}-${overview.range}.xlsx`;
}

export function buildReportsWorkbook(data: ReportsExportPackage): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const overview = data.overview;
  const periodLabel = getReportsPeriodLabel(overview);
  const totals = pdfCashFlowTotals(data);
  const startSummary = data.accountSummaries[0];
  const endSummary = data.accountSummaries[data.accountSummaries.length - 1];
  const periodBalance = pdfPeriodBalanceSummary(startSummary, endSummary);
  const budgetPeriod = pdfBudgetPeriodTotals(data);
  const trendMatrix = pdfCategoryTrendMatrix(data, overview.categories.totals.length);

  addSheet(workbook, 'Report Info', [
    sectionHeader('Alpha Ledger — Financial Report'),
    blankRow(),
    ['Period', periodLabel],
    ['Generated', pdfGeneratedLabel(data.generatedAt)],
    ['Period mode', overview.periodMode],
    ['Range', overview.range],
    ['From date', overview.fromDate ?? '—'],
    ['To date', overview.toDate ?? '—'],
    ['Months in range', overview.months.length],
    ['Transactions', data.transactions.length],
    ['Account snapshots', data.accountSummaries.length],
  ]);

  const executiveRows: Row[] = [
    sectionHeader('Executive summary'),
    blankRow(),
    ['Metric', 'Amount (INR)'],
    ['Total income', totals.income],
    ['Total expenses', totals.expenses],
    ['Total investments', totals.investments],
    ['Net savings', totals.netSavings],
    blankRow(),
  ];

  if (periodBalance && startSummary && endSummary) {
    executiveRows.push(
      sectionHeader('Period start → period end'),
      ['Metric', 'Amount (INR)'],
      [
        `Opening (${pdfMonthLabel(startSummary.year, startSummary.month)})`,
        periodBalance.opening,
      ],
      [
        `Closing (${pdfMonthLabel(endSummary.year, endSummary.month)})`,
        periodBalance.closing,
      ],
      ['Net change across period', periodBalance.netChange],
      ['Accounts added mid-period', periodBalance.addedAccountCount],
      ['Added balances', periodBalance.addedDuringPeriod],
      ['Money in (end month)', periodBalance.moneyIn],
      ['Money out (end month)', periodBalance.moneyOut],
      blankRow(),
    );
  }

  addSheet(workbook, 'Executive Summary', executiveRows);

  addSheet(workbook, 'Cash Flow', [
    ['Year', 'Month', 'Month name', 'Income', 'Expenses', 'Investments', 'Net savings'],
    ...overview.cashFlow.map((point) => [
      point.year,
      point.month,
      MONTH_NAMES[point.month - 1] ?? point.month,
      point.income,
      point.expenses,
      point.investments,
      point.netSavings,
    ]),
  ]);

  addSheet(workbook, 'Net Worth', [
    ['Year', 'Month', 'Month name', 'Closing balance', 'Net change'],
    ...overview.netWorth.map((point) => [
      point.year,
      point.month,
      MONTH_NAMES[point.month - 1] ?? point.month,
      point.totalClosing,
      point.netChange,
    ]),
  ]);

  addSheet(workbook, 'Account Allocation', [
    ['Account', 'Type', 'Color', 'Closing balance', 'Share %'],
    ...overview.accountAllocation.map((item) => [
      item.accountName,
      item.type,
      item.color,
      item.closing,
      Number(item.share.toFixed(2)),
    ]),
  ]);

  const accountBalanceRows: Row[] = [
    [
      'Year',
      'Month',
      'Account',
      'Type',
      'Opening',
      'Closing',
      'Net change',
      'Money in',
      'Money out',
      'Income in',
      'Transfer in',
      'Expense out',
      'Investment out',
      'Transfer out',
      'Opening kind',
      'Existed during period',
    ],
  ];

  for (const summary of data.accountSummaries) {
    for (const account of summary.accounts.filter((item) => item.existedDuringPeriod)) {
      accountBalanceRows.push([
        summary.year,
        summary.month,
        account.accountName,
        account.type,
        account.opening,
        account.closing,
        account.netChange,
        account.moneyIn,
        account.moneyOut,
        account.incomeIn,
        account.transferIn,
        account.expenseOut,
        account.investmentOut,
        account.transferOut,
        account.openingKind,
        account.existedDuringPeriod,
      ]);
    }
    accountBalanceRows.push([
      summary.year,
      summary.month,
      'ALL ACCOUNTS (portfolio total)',
      '',
      summary.totals.openingAtMonthStart,
      summary.totals.closing,
      summary.totals.netChange,
      summary.totals.moneyIn,
      summary.totals.moneyOut,
      summary.totals.incomeIn,
      summary.totals.transferIn,
      summary.totals.expenseOut,
      summary.totals.investmentOut,
      summary.totals.transferOut,
      '',
      '',
    ]);
  }

  addSheet(workbook, 'Account Balances', accountBalanceRows);

  if (endSummary) {
    addSheet(workbook, 'Account Flow Detail', [
      [
        'Account',
        'Type',
        'Opening',
        'Closing',
        'Income in',
        'Transfer in',
        'Expense out',
        'Investment out',
        'Transfer out',
        'Money in',
        'Money out',
        'Net change',
      ],
      ...endSummary.accounts
        .filter((account) => account.existedDuringPeriod)
        .map((account) => [
          account.accountName,
          account.type,
          account.opening,
          account.closing,
          account.incomeIn,
          account.transferIn,
          account.expenseOut,
          account.investmentOut,
          account.transferOut,
          account.moneyIn,
          account.moneyOut,
          account.netChange,
        ]),
    ]);
  }

  addSheet(workbook, 'Categories', [
    ['Category', 'Type', 'Color', 'Total', 'Count'],
    ...overview.categories.totals.map((item) => [
      item.categoryName,
      txnTypeLabel(item.type),
      item.color,
      item.total,
      item.count,
    ]),
  ]);

  if (trendMatrix.categories.length > 0) {
    addSheet(workbook, 'Category Trends', [
      [
        'Month',
        ...trendMatrix.categories.map((category) => category.categoryName),
      ],
      ...trendMatrix.rows.map((row) => [row.label, ...row.values]),
    ]);
  }

  addSheet(workbook, 'Sub-Categories', [
    ['Category', 'Sub-category', 'Total', 'Count'],
    ...overview.categories.subCategories.map((item) => [
      item.categoryName,
      item.subCategoryName,
      item.total,
      item.count,
    ]),
  ]);

  addSheet(workbook, 'Tags', [
    ['Tag', 'Color', 'Total', 'Count'],
    ...overview.tags.map((item) => [
      item.tagName,
      item.color,
      item.total,
      item.count,
    ]),
  ]);

  addSheet(workbook, 'Budgets Period', [
    ['Metric', 'Value'],
    ['Total budget (all months)', budgetPeriod.budgetTotal],
    ['Total spent (all months)', budgetPeriod.spentTotal],
    ['Categories on track (sum)', budgetPeriod.categoriesOnTrack],
    ['Categories with budget (sum)', budgetPeriod.categoriesWithBudget],
    blankRow(),
    ['Year', 'Month', 'Budget total', 'Spent total', 'Categories with budget', 'On track', 'Hit rate %'],
    ...overview.budgets.map((item) => [
      item.year,
      item.month,
      item.budgetTotal,
      item.spentTotal,
      item.categoriesWithBudget,
      item.categoriesOnTrack,
      item.hitRate === null ? '' : Number(item.hitRate.toFixed(2)),
    ]),
  ]);

  addSheet(workbook, 'Budgets Latest Month', [
    ['Year', data.budgetOverview.year],
    ['Month', data.budgetOverview.month],
    blankRow(),
    ['Category', 'Budget', 'Spent', 'Remaining', 'Used %'],
    ...data.budgetOverview.items.map((item) => [
      item.categoryName,
      item.budget,
      item.spent,
      item.remaining,
      Number(item.percentUsed.toFixed(2)),
    ]),
    blankRow(),
    sectionHeader('All expense categories (latest month)'),
    ['Category', 'Budget', 'Spent'],
    ...data.budgetOverview.expenseCategories.map((item) => [
      item.categoryName,
      item.budget ?? '',
      item.spent,
    ]),
  ]);

  const rentalRows: Row[] = [
    sectionHeader('Full period'),
    ['Period total', data.rentalIncomePeriod.periodTotal],
    ['Transaction count', data.rentalIncomePeriod.periodTransactionCount],
    ['Configured', data.rentalIncomePeriod.configured],
    blankRow(),
    ['Property / sub-category', 'Period total', 'Count'],
    ...data.rentalIncomePeriod.byHouse.map((item) => [
      item.subCategoryName,
      item.total,
      item.count,
    ]),
    blankRow(),
    sectionHeader('Latest month snapshot'),
    ['Month total', data.rentalIncome.monthTotal],
    ['Month transactions', data.rentalIncome.monthTransactionCount],
    ['Year to date', data.rentalIncome.yearToDateTotal],
    blankRow(),
    ['Property / sub-category', 'Month total', 'Count'],
    ...data.rentalIncome.byHouse.map((item) => [
      item.subCategoryName,
      item.total,
      item.count,
    ]),
    blankRow(),
    sectionHeader('Year to date by property'),
    ['Property / sub-category', 'YTD total', 'Count'],
    ...data.rentalIncome.yearToDateByHouse.map((item) => [
      item.subCategoryName,
      item.total,
      item.count,
    ]),
  ];
  addSheet(workbook, 'Rental Income', rentalRows);

  const investmentRows: Row[] = [
    sectionHeader('Full period'),
    ['Period total', data.investmentSummaryPeriod.periodTotal],
    ['Transaction count', data.investmentSummaryPeriod.periodTransactionCount],
    blankRow(),
    ['Category', 'Period total', 'Count'],
    ...data.investmentSummaryPeriod.byCategory.map((item) => [
      item.categoryName,
      item.total,
      item.count,
    ]),
    blankRow(),
    sectionHeader('Period sub-categories'),
    ['Category', 'Sub-category', 'Total', 'Count'],
  ];

  for (const category of data.investmentSummaryPeriod.byCategory) {
    for (const sub of category.subCategories) {
      investmentRows.push([
        category.categoryName,
        sub.subCategoryName,
        sub.total,
        sub.count,
      ]);
    }
  }

  investmentRows.push(
    blankRow(),
    sectionHeader('Latest month snapshot'),
    ['Month total', data.investmentSummary.monthTotal],
    ['Month transactions', data.investmentSummary.monthTransactionCount],
    ['Year to date', data.investmentSummary.yearToDateTotal],
    blankRow(),
    ['Category', 'Month total', 'Count'],
    ...data.investmentSummary.byCategory.map((item) => [
      item.categoryName,
      item.total,
      item.count,
    ]),
    blankRow(),
    sectionHeader('YTD by category'),
    ['Category', 'YTD total', 'Count'],
    ...data.investmentSummary.yearToDateByCategory.map((item) => [
      item.categoryName,
      item.total,
      item.count,
    ]),
  );

  addSheet(workbook, 'Investments', investmentRows);

  addSheet(workbook, 'Transactions', [
    [
      'ID',
      'Date',
      'Type',
      'Amount',
      'Account',
      'To account',
      'Category',
      'Sub-category',
      'Category (combined)',
      'Description',
      'Notes',
      'Tags',
      'Cleared',
      'Split count',
      'Created at',
      'Updated at',
    ],
    ...data.transactions.map((transaction) => [
      transaction.id,
      formatDate(transaction.date),
      txnTypeLabel(transaction.type),
      Number(transaction.amount),
      transaction.account?.name ?? '',
      transaction.toAccount?.name ?? '',
      transaction.category?.name ?? '',
      transaction.subCategory?.name ?? '',
      pdfTransactionCategoryLabel(transaction),
      transaction.description,
      transaction.notes ?? '',
      txnTags(transaction),
      transaction.cleared,
      transaction.splits?.length ?? 0,
      transaction.createdAt,
      transaction.updatedAt,
    ]),
  ]);

  const splitRows: Row[] = [
    [
      'Transaction ID',
      'Date',
      'Type',
      'Transaction amount',
      'Description',
      'Split category',
      'Split sub-category',
      'Split amount',
    ],
  ];

  for (const transaction of data.transactions) {
    if (!transaction.splits?.length) {
      continue;
    }

    for (const split of transaction.splits) {
      splitRows.push([
        transaction.id,
        formatDate(transaction.date),
        txnTypeLabel(transaction.type),
        Number(transaction.amount),
        transaction.description,
        split.category.name,
        split.subCategory?.name ?? '',
        Number(split.amount),
      ]);
    }
  }

  addSheet(workbook, 'Transaction Splits', splitRows);

  addSheet(workbook, 'Category Monthly', [
    ['Year', 'Month', 'Category ID', 'Total'],
    ...overview.categories.monthly.flatMap((monthEntry) =>
      monthEntry.totals.map((item) => [
        monthEntry.year,
        monthEntry.month,
        item.categoryId,
        item.total,
      ]),
    ),
  ]);

  addSheet(workbook, 'Months Index', [
    ['Year', 'Month', 'Label'],
    ...overview.months.map((entry) => [
      entry.year,
      entry.month,
      pdfMonthLabel(entry.year, entry.month),
    ]),
  ]);

  return workbook;
}

export function downloadReportsWorkbook(data: ReportsExportPackage) {
  const workbook = buildReportsWorkbook(data);
  XLSX.writeFile(workbook, xlsxFilename(data));
}
