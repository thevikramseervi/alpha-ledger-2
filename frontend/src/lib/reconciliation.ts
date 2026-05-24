export function getReconciliationDifference(
  clearedBalance: number,
  statementBalance: number | null,
): number | null {
  if (statementBalance === null || Number.isNaN(statementBalance)) {
    return null;
  }

  return clearedBalance - statementBalance;
}

export function isReconciliationMatched(difference: number | null): boolean {
  if (difference === null) {
    return false;
  }

  return Math.abs(difference) < 0.01;
}

export function parseStatementBalanceInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}
