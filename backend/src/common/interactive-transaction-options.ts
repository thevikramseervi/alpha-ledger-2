/**
 * Prisma defaults to a 5s interactive transaction timeout.
 * Remote Postgres (e.g. Neon) often needs longer due to network latency.
 */
export const interactiveTransactionOptions = {
  maxWait: 10_000,
  timeout: Number(process.env.PRISMA_TRANSACTION_TIMEOUT_MS ?? 30_000),
};
