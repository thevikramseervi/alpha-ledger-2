import { RecurringTransaction } from "@/types";

export function isRecurringPostedForMonth(
  recurring: RecurringTransaction,
  year: number,
  month: number,
): boolean {
  return (
    recurring.lastPostedYear === year && recurring.lastPostedMonth === month
  );
}

export function getRecurringPendingItems(
  recurringItems: RecurringTransaction[],
  year: number,
  month: number,
): RecurringTransaction[] {
  return recurringItems.filter(
    (item) => item.active && !isRecurringPostedForMonth(item, year, month),
  );
}

export function getRecurringPendingCount(
  recurringItems: RecurringTransaction[],
  year: number,
  month: number,
): number {
  return getRecurringPendingItems(recurringItems, year, month).length;
}
