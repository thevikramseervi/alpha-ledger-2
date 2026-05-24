import { BadRequestException } from '@nestjs/common';

/** UTC calendar day as YYYYMMDD for comparisons. */
export function getCalendarDateKey(date: Date): number {
  return (
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate()
  );
}

/** Parse YYYY-MM-DD (or ISO string) as a UTC calendar date for storage/querying. */
export function parseCalendarDate(dateStr: string): Date {
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0]! : dateStr;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);

  if (!match) {
    throw new BadRequestException(`Invalid date: ${dateStr}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException(`Invalid calendar date: ${dateStr}`);
  }

  return parsed;
}

/** Inclusive UTC date range for a 1-indexed calendar month. */
export function getMonthDateRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0)),
  };
}

/** Build YYYY-MM-DD for a recurring item in a given month (clamps day to month length). */
export function getRecurringDateIso(
  year: number,
  month: number,
  dayOfMonth: number,
): string {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(dayOfMonth, daysInMonth);
  const monthPart = String(month).padStart(2, '0');
  const dayPart = String(day).padStart(2, '0');

  return `${year}-${monthPart}-${dayPart}`;
}

/** Extract 1-indexed calendar month from a stored transaction date. */
export function getCalendarMonth(date: Date): number {
  return date.getUTCMonth() + 1;
}

export type ReportsRange = '6m' | '12m' | 'ytd';

export interface MonthRef {
  year: number;
  month: number;
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

export function getReportsMonthSequence(
  endYear: number,
  endMonth: number,
  range: ReportsRange,
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

export function getReportsMonthSequenceFromDateRange(
  from: Date,
  to: Date,
): MonthRef[] {
  const months: MonthRef[] = [];
  let year = from.getUTCFullYear();
  let month = from.getUTCMonth() + 1;
  const endKey = getCalendarDateKey(to);

  while (months.length < 24) {
    const { start, end } = getMonthDateRange(year, month);
    const monthStartKey = getCalendarDateKey(start);
    const monthEndKey = getCalendarDateKey(end);

    if (monthEndKey < getCalendarDateKey(from)) {
      const next = shiftMonth(year, month, 1);
      year = next.year;
      month = next.month;
      continue;
    }

    if (monthStartKey > endKey) {
      break;
    }

    months.push({ year, month });
    const next = shiftMonth(year, month, 1);
    year = next.year;
    month = next.month;
  }

  return months;
}

export function getOverallDateRange(sequence: MonthRef[]) {
  const first = sequence[0]!;
  const last = sequence[sequence.length - 1]!;
  const { start } = getMonthDateRange(first.year, first.month);
  const { end } = getMonthDateRange(last.year, last.month);
  return { start, end };
}
