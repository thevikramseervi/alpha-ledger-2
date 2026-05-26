"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Scale } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageError, PageLoading } from "@/components/shared/async-state";
import { MonthPicker } from "@/components/shared/month-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { getApiErrorMessage, logApiError, toastApiError } from "@/lib/api-error";
import {
  ACCOUNT_TYPE_LABELS,
  formatCurrency,
  formatDate,
  getCurrentPeriod,
  getTodayIsoDate,
  MONTH_NAMES,
  splitIsoDate,
} from "@/lib/format";
import { MAX_NAME_LENGTH, trimRequired } from "@/lib/validation";
import {
  Account,
  AccountBalanceSummary,
  AccountBalanceSummaryItem,
  AccountType,
} from "@/types";
import { AccountBalanceChart } from "@/components/accounts/account-balance-chart";

interface AccountFormValues {
  name: string;
  type: AccountType;
  trackingStartDate: string;
  initialBalance: string;
  color: string;
}

const defaultFormValues = (): AccountFormValues => ({
  name: "",
  type: "BANK",
  trackingStartDate: getTodayIsoDate(),
  initialBalance: "0",
  color: "#3b82f6",
});

function toDateInputValue(iso: string) {
  return iso.includes("T") ? iso.split("T")[0]! : iso;
}

function accountToFormValues(account: Account): AccountFormValues {
  return {
    name: account.name,
    type: account.type,
    trackingStartDate: toDateInputValue(account.trackingStartDate ?? account.createdAt),
    initialBalance: String(Number(account.initialBalance ?? account.balance)),
    color: account.color,
  };
}

function getTrackingStartKey(trackingStartDate: string) {
  const { year, month } = splitIsoDate(trackingStartDate);
  return getPeriodKey(year, month);
}

function getPeriodKey(year: number, month: number) {
  return year * 100 + month;
}

function isFuturePeriod(year: number, month: number) {
  const current = getCurrentPeriod();
  return getPeriodKey(year, month) > getPeriodKey(current.year, current.month);
}

function isCurrentPeriod(year: number, month: number) {
  const current = getCurrentPeriod();
  return year === current.year && month === current.month;
}

function getNoDataMessage(
  trackingStartDate: string,
  periodLabel: string,
  year: number,
  month: number,
) {
  const selectedKey = getPeriodKey(year, month);
  const trackingStartKey = getTrackingStartKey(trackingStartDate);

  if (selectedKey < trackingStartKey) {
    return `No Alpha Ledger data for ${periodLabel}. Tracking for this account starts ${formatDate(trackingStartDate)}.`;
  }

  return `No Alpha Ledger data for ${periodLabel}.`;
}

function getOpeningLabel(
  summary: AccountBalanceSummaryItem,
  trackingStartDate: string,
) {
  if (summary.openingKind === "TRACKING_START") {
    return `Balance as of ${formatDate(trackingStartDate)}`;
  }

  return `Opening (1 ${MONTH_NAMES[summary.month - 1]})`;
}

function getClosingLabel(summary: AccountBalanceSummaryItem, periodLabel: string) {
  if (summary.isCurrentMonth) {
    return "Closing (today)";
  }

  return `Closing (end of ${periodLabel})`;
}

function RollForwardRow({
  label,
  amount,
  tone = "neutral",
  emphasis = false,
}: {
  label: string;
  amount: number;
  tone?: "neutral" | "positive" | "negative";
  emphasis?: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-rose-400"
        : "text-foreground";

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 text-sm",
        emphasis && "font-medium",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", toneClass)}>
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function BalanceRollForward({
  summary,
  periodLabel,
  trackingStartDate,
}: {
  summary: AccountBalanceSummaryItem;
  periodLabel: string;
  trackingStartDate: string;
}) {
  const activityLines = [
    summary.incomeIn > 0
      ? { label: "Income", amount: summary.incomeIn, tone: "positive" as const }
      : null,
    summary.transferIn > 0
      ? {
          label: "Transfers in",
          amount: summary.transferIn,
          tone: "positive" as const,
        }
      : null,
    summary.expenseOut > 0
      ? {
          label: "Expenses",
          amount: -summary.expenseOut,
          tone: "negative" as const,
        }
      : null,
    summary.investmentOut > 0
      ? {
          label: "Investments",
          amount: -summary.investmentOut,
          tone: "negative" as const,
        }
      : null,
    summary.transferOut > 0
      ? {
          label: "Transfers out",
          amount: -summary.transferOut,
          tone: "negative" as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    amount: number;
    tone: "positive" | "negative";
  }>;

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
      <RollForwardRow
        label={getOpeningLabel(summary, trackingStartDate)}
        amount={summary.opening}
        emphasis
      />

      {activityLines.length > 0 ? (
        <div className="space-y-1 border-l border-border/60 pl-3">
          {activityLines.map((line) => (
            <RollForwardRow
              key={line.label}
              label={line.label}
              amount={line.amount}
              tone={line.tone}
            />
          ))}
        </div>
      ) : (
        <p className="border-l border-border/60 pl-3 text-xs text-muted-foreground">
          No activity recorded in this period.
        </p>
      )}

      <div className="border-t border-border/60 pt-2">
        <RollForwardRow
          label={getClosingLabel(summary, periodLabel)}
          amount={summary.closing}
          emphasis
        />
      </div>
    </div>
  );
}

function PeriodSummaryCards({
  balanceSummary,
  periodLabel,
  viewingCurrentMonth,
}: {
  balanceSummary: AccountBalanceSummary;
  periodLabel: string;
  viewingCurrentMonth: boolean;
}) {
  const { totals } = balanceSummary;
  const closingLabel = viewingCurrentMonth
    ? "Closing (today)"
    : `Closing (end of ${periodLabel})`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-border/60 bg-card/50">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            Opening on 1 {MONTH_NAMES[balanceSummary.month - 1]}
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight">
            {formatCurrency(totals.openingAtMonthStart)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accounts that existed at the start of {periodLabel}
          </p>
        </CardContent>
      </Card>

      {totals.addedAccountCount > 0 ? (
        <Card className="border-border/60 bg-card/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Added during {periodLabel}
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight">
              {formatCurrency(totals.addedDuringPeriod)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totals.addedAccountCount} account
              {totals.addedAccountCount === 1 ? "" : "s"} with a balance-as-of date
              after the 1st
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/60 bg-card/50">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{closingLabel}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">
            {formatCurrency(totals.closing)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Net change</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">
            {formatCurrency(totals.netChange)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AccountsPageClient() {
  const [{ year, month }, setPeriod] = useState(getCurrentPeriod);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<AccountBalanceSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [values, setValues] = useState<AccountFormValues>(defaultFormValues);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const requestIdRef = useRef(0);
  const initialLoadRef = useRef(true);

  const loadAccounts = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setRefreshing(!initialLoadRef.current);
    setLoadError(null);

    try {
      const [accountData, summaryData] = await Promise.all([
        api.accounts.list(),
        api.accounts.balanceSummary(year, month),
      ]);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setAccounts(accountData);
      setBalanceSummary(summaryData);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load accounts", error);
      logApiError("Accounts load failed", error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        initialLoadRef.current = false;
        setInitialLoad(false);
        setRefreshing(false);
      }
    }
  }, [year, month]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const openCreateDialog = () => {
    setEditing(null);
    setValues(defaultFormValues());
    setDialogOpen(true);
  };

  const openEditDialog = (account: Account) => {
    setEditing(account);
    setValues(accountToFormValues(account));
    setDialogOpen(true);
  };

  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance),
    0,
  );
  const summaryByAccountId = new Map(
    balanceSummary?.accounts.map((item) => [item.accountId, item]) ?? [],
  );
  const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const viewingCurrentMonth = isCurrentPeriod(year, month);
  const viewingFutureMonth = isFuturePeriod(year, month);
  const hasPeriodData =
    balanceSummary?.accounts.some((item) => item.existedDuringPeriod) ?? false;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = trimRequired(values.name);
    if (!name) return;

    setSaving(true);
    try {
      const initialBalance = Number(values.initialBalance) || 0;

      if (editing) {
        const originalInitialBalance = Number(
          editing.initialBalance ?? editing.balance,
        );
        const originalTrackingStartDate = toDateInputValue(editing.trackingStartDate);
        await api.accounts.update(editing.id, {
          name,
          type: values.type,
          color: values.color,
          ...(initialBalance !== originalInitialBalance ? { initialBalance } : {}),
          ...(values.trackingStartDate !== originalTrackingStartDate
            ? { trackingStartDate: values.trackingStartDate }
            : {}),
        });
        toast.success("Account updated");
      } else {
        await api.accounts.create({
          name,
          type: values.type,
          trackingStartDate: values.trackingStartDate,
          initialBalance,
          color: values.color,
        });
        toast.success("Account created");
      }

      setDialogOpen(false);
      setEditing(null);
      await loadAccounts();
    } catch (error) {
      toastApiError(editing ? "Failed to update account" : "Failed to create account", error);
      logApiError(editing ? "Account update failed" : "Account create failed", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    try {
      await api.accounts.delete(deleteTarget.id);
      toast.success("Account deleted");
      setDeleteTarget(null);
      await loadAccounts();
    } catch (error) {
      toastApiError("Failed to delete account", error);
      logApiError("Account delete failed", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            {viewingCurrentMonth
              ? `Monthly statement for ${periodLabel}, with closing balances as of today.`
              : viewingFutureMonth
                ? `${periodLabel} has not started yet. Figures assume no activity.`
                : `Monthly statement for ${periodLabel}. All figures are for that month only.`}
          </p>
          {refreshing ? (
            <p className="mt-1 text-xs text-muted-foreground">Updating period…</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <MonthPicker year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add account
          </Button>
        </div>
      </div>

      {viewingFutureMonth && !loading && accounts.length > 0 ? (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100/90">
          {periodLabel} is in the future. Opening and closing assume no transactions
          will occur until then.
        </div>
      ) : null}

      {balanceSummary && !loading && accounts.length > 0 && !hasPeriodData ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Alpha Ledger has no account history for {periodLabel}. Pick a month on or
          after when you added your accounts to see monthly statements.
        </div>
      ) : null}

      {balanceSummary && hasPeriodData ? (
        <>
          <PeriodSummaryCards
            balanceSummary={balanceSummary}
            periodLabel={periodLabel}
            viewingCurrentMonth={viewingCurrentMonth}
          />
          <AccountBalanceChart
            balanceSummary={balanceSummary}
            periodLabel={periodLabel}
          />
        </>
      ) : balanceSummary && !loading && accounts.length > 0 && viewingCurrentMonth ? (
        <Card className="border-border/60 bg-card/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total balance (today)</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {formatCurrency(totalBalance)}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {initialLoad && loading ? (
        <PageLoading message="Loading accounts..." />
      ) : loadError ? (
        <PageError message={loadError} onRetry={() => void loadAccounts()} />
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
          <p className="text-sm font-medium">No accounts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your cash and bank accounts to start tracking balances.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => {
            const summary = summaryByAccountId.get(account.id);

            return (
              <Card
                key={account.id}
                className="border-border/60 bg-card/50 backdrop-blur-sm"
              >
                <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                      <div>
                        <p className="truncate font-medium" title={account.name}>
                          {account.name}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {ACCOUNT_TYPE_LABELS[account.type]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${account.name}`}
                        onClick={() => openEditDialog(account)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${account.name}`}
                        onClick={() => setDeleteTarget(account)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-400" />
                      </Button>
                    </div>
                  </div>

                  {summary?.existedDuringPeriod ? (
                    <BalanceRollForward
                      summary={summary}
                      periodLabel={periodLabel}
                      trackingStartDate={account.trackingStartDate ?? account.createdAt}
                    />
                  ) : (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        {getNoDataMessage(
                          account.trackingStartDate ?? account.createdAt,
                          periodLabel,
                          year,
                          month,
                        )}
                      </p>
                      <p className="text-xs">
                        Alpha Ledger only shows months on or after this account&apos;s
                        balance-as-of date.
                      </p>
                    </div>
                  )}

                  {viewingCurrentMonth && summary?.existedDuringPeriod ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Reconcile to compare this closing balance with your bank statement.
                    </p>
                  ) : null}

                  <Link
                    href={`/accounts/${account.id}/reconcile`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full")}
                  >
                    <Scale className="mr-2 h-4 w-4" />
                    Reconcile
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit account" : "Add account"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account name</Label>
              <Input
                id="accountName"
                placeholder="e.g. Kotak Savings Account"
                value={values.name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) =>
                  setValues((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountType">Type</Label>
              <Select
                value={values.type}
                onValueChange={(value) => {
                  if (!value) return;
                  setValues((current) => ({ ...current, type: value as AccountType }));
                }}
              >
                <SelectTrigger id="accountType" className="w-full">
                  <SelectValue placeholder="Select type">
                    {(value) =>
                      value ? ACCOUNT_TYPE_LABELS[value as AccountType] : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {ACCOUNT_TYPE_LABELS[type]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingStartDate">Balance as of</Label>
              <Input
                id="trackingStartDate"
                type="date"
                value={values.trackingStartDate}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    trackingStartDate: event.target.value,
                  }))
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                {editing
                  ? "The date this starting balance applies to. If transactions exist, this must be on or before your earliest one."
                  : "How much was in this account on this date — e.g. 1 Apr if backfilling from April."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initialBalance">Starting balance</Label>
              <Input
                id="initialBalance"
                type="number"
                step="0.01"
                value={values.initialBalance}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    initialBalance: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {editing
                  ? "Updates the starting snapshot and recalculates the live balance from all transactions on or after that date."
                  : "Account balance on the date above, before you add transactions."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountColor">Color</Label>
              <Input
                id="accountColor"
                type="color"
                value={values.color}
                onChange={(event) =>
                  setValues((current) => ({ ...current, color: event.target.value }))
                }
                className="h-10 w-full cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Create account"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="break-all font-medium text-foreground line-clamp-2">
                {deleteTarget?.name}
              </span>
              ? Accounts with transactions or recurring items cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
