export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_NAME_LENGTH = 100;
export const MAX_SEARCH_LENGTH = 200;
export const MAX_TRANSACTION_AMOUNT = 9999999999.99;

export function isValidTransactionAmount(amount: string): boolean {
  const value = Number(amount);
  return (
    Number.isFinite(value) &&
    value >= 0.01 &&
    value <= MAX_TRANSACTION_AMOUNT
  );
}

export function trimOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function trimRequired(value: string): string {
  return value.trim();
}
