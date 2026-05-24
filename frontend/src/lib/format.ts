import { TransactionType } from '@/types';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  INVESTMENT: 'Investment',
  TRANSFER: 'Transfer',
};

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  INCOME: 'text-emerald-500',
  EXPENSE: 'text-rose-500',
  INVESTMENT: 'text-indigo-400',
  TRANSFER: 'text-sky-400',
};

export const TRANSACTION_TYPE_BG: Record<TransactionType, string> = {
  INCOME: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  EXPENSE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  INVESTMENT: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  TRANSFER: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
};

export const ACCOUNT_TYPE_LABELS: Record<
  import('@/types').AccountType,
  string
> = {
  CASH: 'Cash',
  BANK: 'Bank',
  OTHER: 'Other',
};

export const CATEGORY_TYPES = [
  'INCOME',
  'EXPENSE',
  'INVESTMENT',
] as const satisfies Exclude<TransactionType, 'TRANSFER'>[];

export const DEFAULT_CATEGORY_COLOR: Record<
  (typeof CATEGORY_TYPES)[number],
  string
> = {
  INCOME: '#10b981',
  EXPENSE: '#f43f5e',
  INVESTMENT: '#6366f1',
};

export const DEFAULT_TAG_COLOR = '#6366f1';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const LOCALE = 'en-IN';
export const CURRENCY = 'INR';

export function formatCurrency(amount: number | string) {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatChartAxis(value: number) {
  const abs = Math.abs(value);
  if (abs >= 100000) {
    return `₹${(value / 100000).toFixed(abs % 100000 === 0 ? 0 : 1)}L`;
  }
  if (abs >= 1000) {
    return `₹${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
}

export function parseCalendarDate(date: string): Date {
  const datePart = date.includes('T') ? date.split('T')[0]! : date;
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function splitIsoDate(date: string) {
  const datePart = date.includes('T') ? date.split('T')[0]! : date;
  const [year, month, day] = datePart.split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid date: ${date}`);
  }

  return { year, month, day };
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function toIsoDate(year: number, month: number, day: number) {
  const clampedDay = Math.min(day, getDaysInMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

export function getTodayIsoDate() {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function isoToLocalDate(iso: string) {
  const { year, month, day } = splitIsoDate(iso);
  return new Date(year, month - 1, day);
}

export function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat(LOCALE, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parseCalendarDate(date));
  } catch {
    return '—';
  }
}

export function getCurrentPeriod() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function formatCategoryLabel(
  categoryName: string,
  subCategoryName?: string | null,
) {
  return subCategoryName ? `${categoryName} › ${subCategoryName}` : categoryName;
}

export function formatTransferLabel(fromAccount: string, toAccount: string) {
  return `${fromAccount} → ${toAccount}`;
}
