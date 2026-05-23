export function isValidTransactionAmount(amount: string): boolean {
  const value = Number(amount);
  return Number.isFinite(value) && value >= 0.01;
}

export function trimOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function trimRequired(value: string): string {
  return value.trim();
}
