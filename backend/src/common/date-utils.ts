/** Parse YYYY-MM-DD (or ISO string) as a UTC calendar date for storage/querying. */
export function parseCalendarDate(dateStr: string): Date {
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0]! : dateStr;
  const [year, month, day] = datePart.split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  return new Date(Date.UTC(year, month - 1, day));
}

/** Inclusive UTC date range for a 1-indexed calendar month. */
export function getMonthDateRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0)),
  };
}

/** Extract 1-indexed calendar month from a stored transaction date. */
export function getCalendarMonth(date: Date): number {
  return date.getUTCMonth() + 1;
}
