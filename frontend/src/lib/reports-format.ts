import { MONTH_SHORT } from '@/lib/format';
import { ReportsMonthRef } from '@/types';

export function formatReportsMonthLabel(
  entry: ReportsMonthRef,
  includeYear: boolean,
) {
  const short = MONTH_SHORT[entry.month - 1];
  return includeYear ? `${short} '${String(entry.year).slice(-2)}` : short;
}

export function reportsMonthsNeedYearLabels(months: ReportsMonthRef[]) {
  return new Set(months.map((entry) => entry.year)).size > 1;
}

const RANGE_LABELS: Record<import('@/types').ReportsRange, string> = {
  '6m': 'Last 6 months',
  '12m': 'Last 12 months',
  ytd: 'Year to date',
  custom: 'Custom range',
};

export function getReportsPeriodLabel(overview: import('@/types').ReportsOverview): string {
  if (overview.periodMode === 'custom' && overview.fromDate && overview.toDate) {
    const from = overview.fromDate.includes('T')
      ? overview.fromDate.split('T')[0]!
      : overview.fromDate;
    const to = overview.toDate.includes('T')
      ? overview.toDate.split('T')[0]!
      : overview.toDate;
    return `${from} to ${to}`;
  }

  const monthName = MONTH_SHORT[overview.month - 1];
  return `${monthName} ${overview.year} · ${RANGE_LABELS[overview.range].toLowerCase()}`;
}

export function getReportsRangeDescription(overview: import('@/types').ReportsOverview): string {
  if (overview.periodMode === 'custom') {
    return getReportsPeriodLabel(overview);
  }
  return RANGE_LABELS[overview.range];
}

export function withReportsMonthLabels<T extends ReportsMonthRef>(
  months: T[],
  includeYear?: boolean,
) {
  const showYear = includeYear ?? reportsMonthsNeedYearLabels(months);
  return months.map((entry) => ({
    ...entry,
    label: formatReportsMonthLabel(entry, showYear),
  }));
}
