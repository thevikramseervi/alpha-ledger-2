'use client';

import { Document, Page, Text, View } from '@react-pdf/renderer';
import {
  PdfBarChart,
  PdfHorizontalBarChart,
  PdfLineChart,
  PdfMultiLineChart,
} from '@/lib/reports-pdf/pdf-charts';
import {
  BarRow,
  BrandMark,
  KpiCard,
  PageFooter,
  PdfTable,
  TableOfContents,
} from '@/lib/reports-pdf/pdf-components';
import {
  pdfBudgetPeriodTotals,
  pdfCashFlowTotals,
  pdfCategoryTrendMatrix,
  pdfGeneratedLabel,
  pdfMoney,
  pdfMonthLabel,
  pdfPercent,
  pdfPeriodBalanceSummary,
  pdfPeriodLabel,
  pdfShortMonthLabel,
  pdfSubCategoryGroups,
  pdfTransactionCategoryLabel,
  pdfTransactionTags,
  pdfTxnAmountStyle,
  pdfTxnDate,
  pdfTxnTypeLabel,
} from '@/lib/reports-pdf/pdf-format';
import { pdfStyles, PDF_COLORS } from '@/lib/reports-pdf/pdf-styles';
import { ReportsExportPackage, Transaction } from '@/types';

export type ReportsPdfMode = 'full' | 'summary';

const TOC_SUMMARY = [
  'Executive summary',
  'Cash flow & net worth charts',
  'Account allocation & balances',
  'Categories, tags & trends',
  'Budgets, rental income & investments',
];

const TOC_FULL = [...TOC_SUMMARY, 'Full transaction ledger'];

function buildLedgerRows(transactions: Transaction[]) {
  return transactions.map((transaction) => ({
    cells: [
      pdfTxnDate(transaction.date),
      pdfTxnTypeLabel(transaction.type),
      pdfMoney(transaction.amount),
      transaction.account?.name ?? '—',
      transaction.toAccount?.name ?? '—',
      pdfTransactionCategoryLabel(transaction),
      (transaction.description ?? '').slice(0, 40) || '—',
      transaction.notes ? transaction.notes.slice(0, 28) : '—',
      pdfTransactionTags(transaction) || '—',
      transaction.cleared ? 'Cleared' : 'Pending',
    ],
    amountStyle: pdfTxnAmountStyle(transaction.type),
    clearedStyle: transaction.cleared
      ? pdfStyles.clearedBadge
      : pdfStyles.pendingBadge,
  }));
}

export function ReportsPdfDocument({
  data,
  mode = 'full',
}: {
  data: ReportsExportPackage;
  mode?: ReportsPdfMode;
}) {
  const periodLabel = pdfPeriodLabel(data);
  const totals = pdfCashFlowTotals(data);
  const overview = data.overview;
  const startSummary = data.accountSummaries[0];
  const endSummary = data.accountSummaries[data.accountSummaries.length - 1];
  const periodBalance = pdfPeriodBalanceSummary(startSummary, endSummary);
  const budgetPeriod = pdfBudgetPeriodTotals(data);
  const topCategories = overview.categories.totals.slice(0, 12);
  const maxCategory = topCategories[0]?.total ?? 1;
  const trendMatrix = pdfCategoryTrendMatrix(data, 6);
  const subCategoryGroups = pdfSubCategoryGroups(data, 6);
  const endAccounts =
    endSummary?.accounts.filter((account) => account.existedDuringPeriod) ?? [];
  const includeLedger = mode === 'full';

  const cashFlowRows = overview.cashFlow.map((point) => [
    pdfShortMonthLabel(point.year, point.month),
    pdfMoney(point.income),
    pdfMoney(point.expenses),
    pdfMoney(point.investments),
    pdfMoney(point.netSavings),
  ]);

  const netWorthRows = overview.netWorth.map((point) => [
    pdfShortMonthLabel(point.year, point.month),
    pdfMoney(point.totalClosing),
    pdfMoney(point.netChange),
  ]);

  const allocationRows = overview.accountAllocation.map((item) => [
    item.accountName,
    pdfMoney(item.closing),
    pdfPercent(item.share),
  ]);

  const categoryTrendHeaders = [
    'Month',
    ...trendMatrix.categories.map((category) =>
      category.categoryName.length > 12
        ? `${category.categoryName.slice(0, 12)}…`
        : category.categoryName,
    ),
  ];
  const categoryTrendWidths = [
    '16%',
    ...trendMatrix.categories.map(() =>
      `${Math.floor(84 / Math.max(trendMatrix.categories.length, 1))}%`,
    ),
  ];
  const categoryTrendRows = trendMatrix.rows.map((row) => [
    row.label,
    ...row.values.map((value) => pdfMoney(value)),
  ]);

  const ledgerRows = buildLedgerRows(data.transactions);

  return (
    <Document title={`Alpha Ledger Report — ${periodLabel}`} author="Alpha Ledger">
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.coverPage}>
          <View style={pdfStyles.brandRow}>
            <BrandMark />
            <Text style={pdfStyles.brand}>Alpha Ledger</Text>
          </View>
          <View style={pdfStyles.coverAccent} />
          <Text style={pdfStyles.coverTitle}>Financial Report</Text>
          <Text style={pdfStyles.coverSubtitle}>{periodLabel}</Text>
          <Text style={pdfStyles.coverMeta}>
            Generated {pdfGeneratedLabel(data.generatedAt)}
          </Text>
          <Text style={pdfStyles.coverMeta}>
            {data.transactions.length} transactions · {data.accountSummaries.length}{' '}
            monthly snapshots · {mode === 'summary' ? 'Summary edition' : 'Full edition'}
          </Text>
          <TableOfContents items={includeLedger ? TOC_FULL : TOC_SUMMARY} />
        </View>
        <PageFooter section="Cover" />
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.sectionTitle}>Executive summary</Text>
        <View style={pdfStyles.kpiRow}>
          <KpiCard label="Income" value={pdfMoney(totals.income)} color={PDF_COLORS.emerald} />
          <KpiCard label="Expenses" value={pdfMoney(totals.expenses)} color={PDF_COLORS.rose} />
          <KpiCard
            label="Investments"
            value={pdfMoney(totals.investments)}
            color={PDF_COLORS.indigo}
          />
          <KpiCard
            label="Net savings"
            value={pdfMoney(totals.netSavings)}
            color={totals.netSavings >= 0 ? PDF_COLORS.amber : PDF_COLORS.rose}
          />
        </View>

        {periodBalance ? (
          <>
            <Text style={pdfStyles.subsectionTitle}>Period start → period end</Text>
            <PdfTable
              headers={['Metric', 'Amount']}
              widths={['55%', '45%']}
              rows={[
                [
                  `Opening balance (${startSummary ? pdfMonthLabel(startSummary.year, startSummary.month) : 'start'})`,
                  pdfMoney(periodBalance.opening),
                ],
                [
                  `Closing balance (${endSummary ? pdfMonthLabel(endSummary.year, endSummary.month) : 'end'})`,
                  pdfMoney(periodBalance.closing),
                ],
                ['Net change across period', pdfMoney(periodBalance.netChange)],
                ['Accounts added mid-period', String(periodBalance.addedAccountCount)],
                ['Added balances', pdfMoney(periodBalance.addedDuringPeriod)],
              ]}
            />
          </>
        ) : null}

        <PdfLineChart
          title="Net worth trend"
          points={overview.netWorth.map((point) => ({
            label: pdfShortMonthLabel(point.year, point.month),
            value: point.totalClosing,
          }))}
          color={PDF_COLORS.emerald}
        />

        <PdfBarChart
          title="Monthly net savings"
          points={overview.cashFlow.map((point) => ({
            label: pdfShortMonthLabel(point.year, point.month),
            value: point.netSavings,
          }))}
          color={PDF_COLORS.amber}
        />

        <Text style={pdfStyles.subsectionTitle}>Cash flow by month</Text>
        <PdfTable
          headers={['Month', 'Income', 'Expenses', 'Investments', 'Net savings']}
          widths={['18%', '20%', '20%', '22%', '20%']}
          rows={cashFlowRows}
          zebra
        />

        <Text style={pdfStyles.subsectionTitle}>Net worth by month</Text>
        <PdfTable
          headers={['Month', 'Closing balance', 'Net change']}
          widths={['34%', '33%', '33%']}
          rows={netWorthRows}
          zebra
        />
        <PageFooter section="Executive summary" />
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.sectionTitle}>Account allocation</Text>
        <PdfHorizontalBarChart
          title="Closing balance share (period end)"
          points={overview.accountAllocation.map((item) => ({
            label: item.accountName,
            value: item.closing,
            color: item.color,
          }))}
        />
        <PdfTable
          headers={['Account', 'Closing balance', 'Share']}
          widths={['46%', '32%', '22%']}
          rows={allocationRows}
          zebra
        />

        <Text style={pdfStyles.sectionTitle}>Account balances by month</Text>
        <Text style={pdfStyles.paragraph}>
          Opening and closing balances for each account. Period starts{' '}
          {startSummary ? pdfMonthLabel(startSummary.year, startSummary.month) : '—'} and ends{' '}
          {endSummary ? pdfMonthLabel(endSummary.year, endSummary.month) : '—'}.
        </Text>

        {data.accountSummaries.map((summary) => (
          <View key={`${summary.year}-${summary.month}`}>
            <Text style={pdfStyles.subsectionTitle}>
              {pdfMonthLabel(summary.year, summary.month)}
            </Text>
            <PdfTable
              headers={['Account', 'Opening', 'Closing', 'Net chg', 'In', 'Out']}
              widths={['28%', '14%', '14%', '12%', '16%', '16%']}
              rows={summary.accounts
                .filter((account) => account.existedDuringPeriod)
                .map((account) => [
                  account.accountName,
                  pdfMoney(account.opening),
                  pdfMoney(account.closing),
                  pdfMoney(account.netChange),
                  pdfMoney(account.moneyIn),
                  pdfMoney(account.moneyOut),
                ])}
              zebra
            />
            <PdfTable
              headers={['Portfolio total', 'Opening', 'Closing', 'Net change']}
              widths={['40%', '20%', '20%', '20%']}
              rows={[
                [
                  'All accounts',
                  pdfMoney(summary.totals.openingAtMonthStart),
                  pdfMoney(summary.totals.closing),
                  pdfMoney(summary.totals.netChange),
                ],
              ]}
            />
          </View>
        ))}

        {endAccounts.length > 0 ? (
          <>
            <Text style={pdfStyles.sectionTitle}>Account flow detail (period end)</Text>
            <PdfTable
              headers={[
                'Account',
                'Income',
                'Transfers in',
                'Expenses',
                'Investments',
                'Transfers out',
              ]}
              widths={['24%', '14%', '14%', '14%', '16%', '18%']}
              rows={endAccounts.map((account) => [
                account.accountName,
                pdfMoney(account.incomeIn),
                pdfMoney(account.transferIn),
                pdfMoney(account.expenseOut),
                pdfMoney(account.investmentOut),
                pdfMoney(account.transferOut),
              ])}
              zebra
            />
          </>
        ) : null}
        <PageFooter section="Accounts" />
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.sectionTitle}>Spending & categories</Text>
        {topCategories.map((category) => (
          <BarRow
            key={category.categoryId}
            label={`${category.categoryName} (${pdfTxnTypeLabel(category.type)})`}
            value={category.total}
            max={maxCategory}
            color={category.color}
            suffix={`${category.count} txn`}
          />
        ))}

        <PdfMultiLineChart
          title="Top category trends"
          points={trendMatrix.rows.map((row) => ({
            label: row.label,
            values: row.values,
          }))}
          seriesLabels={trendMatrix.categories.map((category) => category.categoryName)}
          colors={trendMatrix.categories.map((category) => category.color)}
        />

        {categoryTrendRows.length > 0 ? (
          <>
            <Text style={pdfStyles.subsectionTitle}>Category trend matrix</Text>
            <PdfTable
              headers={categoryTrendHeaders}
              widths={categoryTrendWidths}
              rows={categoryTrendRows}
              zebra
            />
          </>
        ) : null}

        <Text style={pdfStyles.subsectionTitle}>Category totals</Text>
        <PdfTable
          headers={['Category', 'Type', 'Total', 'Count']}
          widths={['40%', '18%', '24%', '18%']}
          rows={overview.categories.totals.map((item) => [
            item.categoryName,
            pdfTxnTypeLabel(item.type),
            pdfMoney(item.total),
            String(item.count),
          ])}
          zebra
        />

        {subCategoryGroups.some((group) => group.subCategories.length > 0) ? (
          <>
            <Text style={pdfStyles.sectionTitle}>Sub-category breakdown</Text>
            {subCategoryGroups.map(({ category, subCategories }) =>
              subCategories.length > 0 ? (
                <View key={category.categoryId}>
                  <Text style={pdfStyles.subsectionTitle}>{category.categoryName}</Text>
                  <PdfTable
                    headers={['Sub-category', 'Total', 'Count']}
                    widths={['52%', '28%', '20%']}
                    rows={subCategories.map((item) => [
                      item.subCategoryName,
                      pdfMoney(item.total),
                      String(item.count),
                    ])}
                    zebra
                  />
                </View>
              ) : null,
            )}
          </>
        ) : null}

        {overview.tags.length > 0 ? (
          <>
            <Text style={pdfStyles.sectionTitle}>Tags</Text>
            <PdfTable
              headers={['Tag', 'Total', 'Count']}
              widths={['50%', '25%', '25%']}
              rows={overview.tags.map((item) => [
                item.tagName,
                pdfMoney(item.total),
                String(item.count),
              ])}
              zebra
            />
          </>
        ) : null}
        <PageFooter section="Categories & tags" />
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.sectionTitle}>Budgets</Text>
        <PdfTable
          headers={['Metric', 'Amount / count']}
          widths={['55%', '45%']}
          rows={[
            ['Total budget (all months)', pdfMoney(budgetPeriod.budgetTotal)],
            ['Total spent (all months)', pdfMoney(budgetPeriod.spentTotal)],
            [
              'Categories on track',
              `${budgetPeriod.categoriesOnTrack} / ${budgetPeriod.categoriesWithBudget}`,
            ],
          ]}
        />

        <Text style={pdfStyles.subsectionTitle}>
          Latest month detail (
          {endSummary ? pdfMonthLabel(endSummary.year, endSummary.month) : '—'})
        </Text>
        {data.budgetOverview.items.length > 0 ? (
          <PdfTable
            headers={['Category', 'Budget', 'Spent', 'Remaining', 'Used']}
            widths={['34%', '16%', '16%', '18%', '16%']}
            rows={data.budgetOverview.items.map((item) => [
              item.categoryName,
              pdfMoney(item.budget),
              pdfMoney(item.spent),
              pdfMoney(item.remaining),
              pdfPercent(item.percentUsed),
            ])}
            zebra
          />
        ) : (
          <Text style={pdfStyles.paragraph}>No budgets set for the latest month.</Text>
        )}

        {overview.budgets.length > 0 ? (
          <>
            <Text style={pdfStyles.subsectionTitle}>Budget hit rate by month</Text>
            <PdfTable
              headers={['Month', 'Budget', 'Spent', 'On track', 'Hit rate']}
              widths={['22%', '20%', '20%', '18%', '20%']}
              rows={overview.budgets.map((item) => [
                pdfShortMonthLabel(item.year, item.month),
                pdfMoney(item.budgetTotal),
                pdfMoney(item.spentTotal),
                `${item.categoriesOnTrack}/${item.categoriesWithBudget}`,
                item.hitRate === null ? '—' : pdfPercent(item.hitRate),
              ])}
              zebra
            />
          </>
        ) : null}

        <Text style={pdfStyles.sectionTitle}>Rental income (full period)</Text>
        {data.rentalIncomePeriod.configured ? (
          <>
            <PdfTable
              headers={['Metric', 'Amount']}
              widths={['55%', '45%']}
              rows={[
                ['Period total', pdfMoney(data.rentalIncomePeriod.periodTotal)],
                [
                  'Transactions',
                  String(data.rentalIncomePeriod.periodTransactionCount),
                ],
              ]}
            />
            {data.rentalIncomePeriod.byHouse.length > 0 ? (
              <PdfTable
                headers={['Property / sub-category', 'Period total', 'Count']}
                widths={['50%', '30%', '20%']}
                rows={data.rentalIncomePeriod.byHouse.map((item) => [
                  item.subCategoryName,
                  pdfMoney(item.total),
                  String(item.count),
                ])}
                zebra
              />
            ) : null}
            <Text style={pdfStyles.paragraph}>
              Latest month: {pdfMoney(data.rentalIncome.monthTotal)} · YTD:{' '}
              {pdfMoney(data.rentalIncome.yearToDateTotal)}
            </Text>
          </>
        ) : (
          <Text style={pdfStyles.paragraph}>
            No Rental Income category configured.
          </Text>
        )}

        <Text style={pdfStyles.sectionTitle}>Investments (full period)</Text>
        <PdfTable
          headers={['Metric', 'Amount']}
          widths={['55%', '45%']}
          rows={[
            ['Period total', pdfMoney(data.investmentSummaryPeriod.periodTotal)],
            [
              'Transactions',
              String(data.investmentSummaryPeriod.periodTransactionCount),
            ],
          ]}
        />
        {data.investmentSummaryPeriod.byCategory.length > 0 ? (
          <PdfTable
            headers={['Category', 'Period total', 'Count']}
            widths={['45%', '35%', '20%']}
            rows={data.investmentSummaryPeriod.byCategory.map((item) => [
              item.categoryName,
              pdfMoney(item.total),
              String(item.count),
            ])}
            zebra
          />
        ) : null}
        <Text style={pdfStyles.paragraph}>
          Latest month: {pdfMoney(data.investmentSummary.monthTotal)} · YTD:{' '}
          {pdfMoney(data.investmentSummary.yearToDateTotal)}
        </Text>
        <PageFooter section="Budgets & specialty" />
      </Page>

      {includeLedger ? (
        <Page size="A4" style={pdfStyles.page} wrap>
          <Text style={pdfStyles.sectionTitle}>Transaction ledger</Text>
          <Text style={pdfStyles.paragraph}>
            All {data.transactions.length} transactions in this period, sorted by date.
          </Text>
          <PdfTable
            headers={[
              'Date',
              'Type',
              'Amount',
              'Account',
              'To',
              'Category',
              'Description',
              'Notes',
              'Tags',
              'Status',
            ]}
            widths={['8%', '8%', '9%', '10%', '8%', '13%', '14%', '12%', '10%', '8%']}
            rows={ledgerRows.map((row) => row.cells)}
            cellStyles={ledgerRows.map((row) => [
              undefined,
              undefined,
              row.amountStyle,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              row.clearedStyle,
            ])}
            zebra
          />
          <PageFooter section="Transaction ledger" />
        </Page>
      ) : null}
    </Document>
  );
}
