import { MONTH_SHORT } from '@/lib/format';
import {
  AccountBalanceTrend,
  AccountBalanceTrendPoint,
  MonthlySummary,
  YearlyTrendPoint,
} from '@/types';

export type DashboardChartRange = '6m' | '12m' | 'ytd';

export type DashboardStatKey =
  | 'income'
  | 'expenses'
  | 'investments'
  | 'netSavings';

export interface MonthRef {
  year: number;
  month: number;
}

export interface CashFlowChartPoint extends YearlyTrendPoint {
  year: number;
  label: string;
}

export interface NetWorthChartPoint extends AccountBalanceTrendPoint {
  year: number;
  label: string;
}

export interface PeriodComparison {
  delta: number;
  percent: number | null;
  label: string;
}

export function shiftMonth(
  year: number,
  month: number,
  offset: number,
): MonthRef {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

export function getComparisonMonths(year: number, month: number) {
  return {
    previousMonth: shiftMonth(year, month, -1),
    sameMonthLastYear: { year: year - 1, month },
  };
}

export function getChartMonthSequence(
  endYear: number,
  endMonth: number,
  range: DashboardChartRange,
): MonthRef[] {
  if (range === 'ytd') {
    return Array.from({ length: endMonth }, (_, index) => ({
      year: endYear,
      month: index + 1,
    }));
  }

  const count = range === '6m' ? 6 : 12;
  return Array.from({ length: count }, (_, index) =>
    shiftMonth(endYear, endMonth, index - (count - 1)),
  );
}

function formatMonthLabel(year: number, month: number, includeYear: boolean) {
  const short = MONTH_SHORT[month - 1];
  return includeYear ? `${short} '${String(year).slice(-2)}` : short;
}

function needsYearOnChartLabels(sequence: MonthRef[]) {
  return new Set(sequence.map((entry) => entry.year)).size > 1;
}

export function buildCashFlowChartSeries(
  sequence: MonthRef[],
  trendsByYear: Map<number, YearlyTrendPoint[]>,
): CashFlowChartPoint[] {
  const includeYear = needsYearOnChartLabels(sequence);

  return sequence.map(({ year, month }) => {
    const point =
      trendsByYear.get(year)?.find((entry) => entry.month === month) ?? {
        month,
        income: 0,
        expenses: 0,
        investments: 0,
        netSavings: 0,
      };

    return {
      ...point,
      year,
      label: formatMonthLabel(year, month, includeYear),
    };
  });
}

export function buildNetWorthChartSeries(
  sequence: MonthRef[],
  trendsByYear: Map<number, AccountBalanceTrend>,
): NetWorthChartPoint[] {
  const includeYear = needsYearOnChartLabels(sequence);

  return sequence.map(({ year, month }) => {
    const point = trendsByYear.get(year)?.points.find((entry) => entry.month === month) ?? {
      month,
      totalClosing: 0,
      netChange: 0,
    };

    return {
      ...point,
      year,
      label: formatMonthLabel(year, month, includeYear),
    };
  });
}

export function computeSavingsRate(income: number, netSavings: number): number | null {
  if (income <= 0) {
    return null;
  }
  return (netSavings / income) * 100;
}

export function formatSavingsRate(rate: number | null): string {
  if (rate === null) {
    return '—';
  }
  return `${rate.toFixed(1)}%`;
}

export function computePeriodComparison(
  current: number,
  previous: number | undefined,
  label: string,
): PeriodComparison | null {
  if (previous === undefined) {
    return null;
  }

  const delta = current - previous;

  if (previous === 0 && current === 0) {
    return null;
  }

  if (previous === 0) {
    return {
      delta,
      percent: null,
      label,
    };
  }

  return {
    delta,
    percent: (delta / Math.abs(previous)) * 100,
    label,
  };
}

export function getComparisonTone(
  key: DashboardStatKey | 'savingsRate',
  delta: number,
): 'positive' | 'negative' | 'neutral' {
  if (delta === 0) {
    return 'neutral';
  }

  if (key === 'expenses') {
    return delta > 0 ? 'negative' : 'positive';
  }

  return delta > 0 ? 'positive' : 'negative';
}

export function formatComparisonLine(comparison: PeriodComparison): string {
  if (comparison.percent === null) {
    if (comparison.delta === 0) {
      return `Flat ${comparison.label}`;
    }
    return `New ${comparison.label}`;
  }

  const sign = comparison.percent > 0 ? '+' : '';
  return `${sign}${comparison.percent.toFixed(1)}% ${comparison.label}`;
}

export function pickSummaryValue(
  summary: MonthlySummary | null | undefined,
  key: DashboardStatKey,
): number | undefined {
  if (!summary) {
    return undefined;
  }
  return summary[key];
}

export function getYearsNeededForChartRange(
  endYear: number,
  endMonth: number,
  range: DashboardChartRange,
): number[] {
  const sequence = getChartMonthSequence(endYear, endMonth, range);
  return [...new Set(sequence.map((entry) => entry.year))].sort((a, b) => a - b);
}

export function trendsMapFromResponses(
  entries: Array<{ year: number; points: YearlyTrendPoint[] | null }>,
): Map<number, YearlyTrendPoint[]> {
  const map = new Map<number, YearlyTrendPoint[]>();
  for (const entry of entries) {
    if (entry.points) {
      map.set(entry.year, entry.points);
    }
  }
  return map;
}

export function balanceTrendsMapFromResponses(
  entries: Array<{ year: number; trend: AccountBalanceTrend | null }>,
): Map<number, AccountBalanceTrend> {
  const map = new Map<number, AccountBalanceTrend>();
  for (const entry of entries) {
    if (entry.trend) {
      map.set(entry.year, entry.trend);
    }
  }
  return map;
}

export const CHART_RANGE_LABELS: Record<DashboardChartRange, string> = {
  '6m': '6 months',
  '12m': '12 months',
  ytd: 'Year to date',
};
