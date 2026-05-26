import { TransactionType } from '../generated/prisma/client';
import { getTransactionEffectOnAccount } from './account-balance-effect';
import { getCalendarDateKey, getMonthDateRange } from './date-utils';

type BalanceTransaction = {
  type: TransactionType;
  amount: number | string;
  date: Date;
  accountId: string;
  toAccountId: string | null;
};

type BalanceAccount = {
  id: string;
  balance: number | string;
  initialBalance: number | string;
  trackingStartDate: Date;
};

export type AccountOpeningKind = 'CALENDAR' | 'TRACKING_START';

function getTodayUtcDate(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function getAccountBalanceAtMonthBoundaries(
  account: BalanceAccount,
  transactions: BalanceTransaction[],
  year: number,
  month: number,
) {
  const { start: monthStart, end: monthEnd } = getMonthDateRange(year, month);
  const today = getTodayUtcDate();
  const isCurrentMonth =
    year === today.getUTCFullYear() && month === today.getUTCMonth() + 1;
  const periodEnd =
    isCurrentMonth && today.getTime() < monthEnd.getTime() ? today : monthEnd;

  const trackingStartKey = getCalendarDateKey(account.trackingStartDate);
  const monthStartKey = getCalendarDateKey(monthStart);
  const periodEndKey = getCalendarDateKey(periodEnd);

  if (trackingStartKey > periodEndKey) {
    return {
      year,
      month,
      isCurrentMonth,
      existedAtMonthStart: false,
      existedDuringPeriod: false,
      openingKind: 'CALENDAR' as AccountOpeningKind,
      opening: 0,
      closing: 0,
      startingBalance: 0,
      transactionNet: 0,
      netChange: 0,
      moneyIn: 0,
      moneyOut: 0,
      incomeIn: 0,
      transferIn: 0,
      expenseOut: 0,
      investmentOut: 0,
      transferOut: 0,
    };
  }

  const storedInitialBalance = Number(account.initialBalance);
  const existedAtMonthStart = trackingStartKey <= monthStartKey;
  const activityStartKey = Math.max(monthStartKey, trackingStartKey);

  let effectsToPeriodEnd = 0;
  let effectsBeforeMonthStart = 0;
  let incomeIn = 0;
  let transferIn = 0;
  let expenseOut = 0;
  let investmentOut = 0;
  let transferOut = 0;

  for (const transaction of transactions) {
    const effect = getTransactionEffectOnAccount(
      transaction.type,
      transaction.amount,
      account.id,
      transaction.accountId,
      transaction.toAccountId,
    );

    if (effect === 0) {
      continue;
    }

    const transactionKey = getCalendarDateKey(transaction.date);

    if (transactionKey < trackingStartKey || transactionKey > periodEndKey) {
      continue;
    }

    effectsToPeriodEnd += effect;

    if (transactionKey < monthStartKey) {
      effectsBeforeMonthStart += effect;
    }

    if (transactionKey >= activityStartKey) {
      if (transaction.type === TransactionType.TRANSFER) {
        if (effect > 0) {
          transferIn += effect;
        } else {
          transferOut += Math.abs(effect);
        }
      } else if (transaction.type === TransactionType.INCOME) {
        incomeIn += effect;
      } else if (transaction.type === TransactionType.INVESTMENT) {
        investmentOut += Math.abs(effect);
      } else {
        expenseOut += Math.abs(effect);
      }
    }
  }

  const closing = storedInitialBalance + effectsToPeriodEnd;
  const moneyIn = incomeIn + transferIn;
  const moneyOut = expenseOut + investmentOut + transferOut;
  const transactionNet = moneyIn - moneyOut;

  let opening: number;
  let startingBalance = 0;
  let openingKind: AccountOpeningKind = 'CALENDAR';

  if (existedAtMonthStart) {
    opening = storedInitialBalance + effectsBeforeMonthStart;
  } else {
    openingKind = 'TRACKING_START';
    startingBalance =
      storedInitialBalance !== 0
        ? storedInitialBalance
        : closing - transactionNet;
    opening = startingBalance;
  }

  return {
    year,
    month,
    isCurrentMonth,
    existedAtMonthStart,
    existedDuringPeriod: true,
    openingKind,
    opening,
    closing,
    startingBalance,
    transactionNet,
    netChange: closing - opening,
    moneyIn,
    moneyOut,
    incomeIn,
    transferIn,
    expenseOut,
    investmentOut,
    transferOut,
  };
}
