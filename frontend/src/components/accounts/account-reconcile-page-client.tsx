"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PageError, PageLoading } from "@/components/shared/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { getApiErrorMessage, logApiError, toastApiError } from "@/lib/api-error";
import {
  formatCurrency,
  formatDate,
  formatTransferLabel,
  TRANSACTION_TYPE_BG,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/format";
import {
  getReconciliationDifference,
  isReconciliationMatched,
  parseStatementBalanceInput,
} from "@/lib/reconciliation";
import { AccountReconciliation, ReconciliationTransaction } from "@/types";

type FilterMode = "ALL" | "PENDING" | "CLEARED";

function formatSignedAmount(amount: number) {
  const prefix = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${prefix}${formatCurrency(Math.abs(amount))}`;
}

export function AccountReconcilePageClient() {
  const params = useParams<{ id: string }>();
  const accountId = params.id;
  const [data, setData] = useState<AccountReconciliation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statementInput, setStatementInput] = useState("");
  const [filter, setFilter] = useState<FilterMode>("PENDING");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadReconciliation = useCallback(async () => {
    if (!accountId) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);

    try {
      const result = await api.accounts.reconciliation(accountId);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setData(result);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load reconciliation", error);
      logApiError("API request failed", error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [accountId]);

  useEffect(() => {
    void loadReconciliation();
  }, [loadReconciliation]);

  const statementBalance = parseStatementBalanceInput(statementInput);
  const difference = data
    ? getReconciliationDifference(data.clearedBalance, statementBalance)
    : null;
  const matched = isReconciliationMatched(difference);

  const filteredTransactions =
    data?.transactions.filter((transaction) => {
      if (filter === "PENDING") {
        return !transaction.cleared;
      }
      if (filter === "CLEARED") {
        return transaction.cleared;
      }
      return true;
    }) ?? [];

  const handleToggleCleared = async (transaction: ReconciliationTransaction) => {
    setTogglingId(transaction.id);
    try {
      await api.transactions.update(transaction.id, {
        cleared: !transaction.cleared,
      });
      await loadReconciliation();
    } catch (error) {
      toastApiError("Failed to update transaction", error);
      logApiError("API request failed", error);
    } finally {
      setTogglingId(null);
    }
  };

  if (!accountId) {
    return <PageError message="Account not found" onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Link
            href="/accounts"
            className="inline-flex w-fit items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to accounts
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Reconcile {data?.account.name ?? "account"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your bank balance and tick transactions that appear on your statement.
            </p>
          </div>
        </div>
        {matched ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Matched with statement
          </div>
        ) : null}
      </div>

      {loading ? (
        <PageLoading message="Loading reconciliation..." />
      ) : loadError || !data ? (
        <PageError message={loadError ?? "Unable to load reconciliation"} onRetry={() => void loadReconciliation()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Ledger balance" value={formatCurrency(data.ledgerBalance)} />
            <SummaryCard
              label="Pending (uncleared)"
              value={formatSignedAmount(data.pendingTotal)}
              hint={`${data.pendingCount} transaction${data.pendingCount === 1 ? "" : "s"}`}
            />
            <SummaryCard
              label="Cleared balance"
              value={formatCurrency(data.clearedBalance)}
              hint={`${data.clearedCount} cleared`}
            />
            <Card className="border-border/60 bg-card/50">
              <CardContent className="space-y-2 p-5">
                <Label htmlFor="statementBalance">Statement balance</Label>
                <Input
                  id="statementBalance"
                  type="number"
                  step="0.01"
                  placeholder="From bank app or statement"
                  value={statementInput}
                  onChange={(event) => setStatementInput(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {difference === null
                    ? "Enter the balance shown by your bank."
                    : matched
                      ? "Cleared balance matches your statement."
                      : `Difference: ${formatSignedAmount(difference)}`}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["PENDING", "CLEARED", "ALL"] as FilterMode[]).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={filter === mode ? "default" : "outline"}
                onClick={() => setFilter(mode)}
              >
                {mode === "PENDING"
                  ? `Pending (${data.pendingCount})`
                  : mode === "CLEARED"
                    ? `Cleared (${data.clearedCount})`
                    : `All (${data.transactions.length})`}
              </Button>
            ))}
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
              <p className="text-sm font-medium">No transactions in this view</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === "PENDING"
                  ? "Everything is cleared for this account."
                  : "Try another filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[72px]">Cleared</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Effect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={transaction.cleared}
                          disabled={togglingId === transaction.id}
                          onChange={() => void handleToggleCleared(transaction)}
                          aria-label={`Mark ${transaction.description} as cleared`}
                          className="h-4 w-4 rounded border-border"
                        />
                      </TableCell>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          {transaction.notes ? (
                            <p className="text-xs text-muted-foreground">
                              {transaction.notes}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={TRANSACTION_TYPE_BG[transaction.type]}
                        >
                          {TRANSACTION_TYPE_LABELS[transaction.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transaction.type === "TRANSFER" && transaction.toAccount
                          ? formatTransferLabel(
                              transaction.account.name,
                              transaction.toAccount.name,
                            )
                          : (transaction.category?.name ?? transaction.account.name)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          transaction.effectOnAccount >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {formatSignedAmount(transaction.effectOnAccount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="border-border/60 bg-card/50">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
