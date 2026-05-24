import { TransactionType } from '../generated/prisma/client';

export function getTransactionEffectOnAccount(
  type: TransactionType,
  amount: number | string,
  accountId: string,
  transactionAccountId: string,
  toAccountId?: string | null,
): number {
  const value = typeof amount === 'string' ? Number(amount) : amount;

  if (type === TransactionType.TRANSFER) {
    if (transactionAccountId === accountId) {
      return -value;
    }
    if (toAccountId === accountId) {
      return value;
    }
    return 0;
  }

  if (transactionAccountId !== accountId) {
    return 0;
  }

  return type === TransactionType.INCOME ? value : -value;
}
