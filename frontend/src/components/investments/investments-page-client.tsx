"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { MonthPicker } from "@/components/shared/month-picker";
import { PageError, PageLoading } from "@/components/shared/async-state";
import { InvestmentCategoryBreakdown } from "@/components/investments/investment-category-breakdown";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { getApiErrorMessage, toastApiError } from "@/lib/api-error";
import {
  formatCategoryLabel,
  formatCurrency,
  formatDate,
  getCurrentPeriod,
  MONTH_NAMES,
} from "@/lib/format";
import { Account, InvestmentSummary, Transaction } from "@/types";

export function InvestmentsPageClient() {
  const [{ year, month }, setPeriod] = useState(getCurrentPeriod);
  const [accountFilter, setAccountFilter] = useState<string>("ALL");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    setSummary(null);
    setTransactions([]);

    try {
      const accountId = accountFilter === "ALL" ? undefined : accountFilter;
      const [accountsData, summaryData] = await Promise.all([
        api.accounts.list(),
        api.transactions.investmentSummary(year, month, accountId),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setAccounts(accountsData);
      setSummary(summaryData);

      const txData = await api.transactions.list({
        year,
        month,
        type: "INVESTMENT",
        accountId,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setTransactions(txData);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load investment data", error);
      console.error(error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [year, month, accountFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedAccount =
    accountFilter === "ALL"
      ? null
      : accounts.find((account) => account.id === accountFilter) ?? null;

  const hasInvestmentCategories =
    summary?.byCategory.some((category) => category.categoryId !== null) ?? false;

  const header = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Investments</h1>
        <p className="text-sm text-muted-foreground">
          Track contributions by category, sub-category, and account
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <MonthPicker
          year={year}
          month={month}
          onChange={(y, m) => setPeriod({ year: y, month: m })}
        />
        <Select
          value={accountFilter}
          onValueChange={(value) => {
            if (!value) return;
            setAccountFilter(value);
          }}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filter by account">
              {(value) =>
                value === "ALL"
                  ? "All accounts"
                  : accounts.find((account) => account.id === value)?.name ??
                    "Account"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All accounts</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <PageLoading message="Loading investments..." />
      </div>
    );
  }

  if (loadError || !summary) {
    return (
      <div className="space-y-6">
        {header}
        <PageError
          message={loadError ?? "Investment data is unavailable."}
          onRetry={() => void loadData()}
        />
      </div>
    );
  }

  if (!hasInvestmentCategories) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
          <TrendingUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No investment categories yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create investment categories on the Categories page to track MF, stocks,
            FD, and other contributions.
          </p>
          <Link href="/categories">
            <Button className="mt-4">Go to Categories</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="relative overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-60" />
          <CardContent className="relative p-5">
            <p className="text-sm font-medium text-muted-foreground">This month</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {formatCurrency(summary.monthTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.monthTransactionCount} contribution
              {summary.monthTransactionCount === 1 ? "" : "s"}
              {selectedAccount ? ` · ${selectedAccount.name}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/15 to-transparent opacity-60" />
          <CardContent className="relative p-5">
            <p className="text-sm font-medium text-muted-foreground">Year to date</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {formatCurrency(summary.yearToDateTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              January through {MONTH_NAMES[month - 1]} {year}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InvestmentCategoryBreakdown
          title="This month by category"
          description="Investment categories and sub-categories for the selected period"
          total={summary.monthTotal}
          categories={summary.byCategory}
          emptyMessage="No investments recorded for this month."
        />
        <InvestmentCategoryBreakdown
          title="Year to date by category"
          description={`Cumulative investments through ${MONTH_NAMES[month - 1]}`}
          total={summary.yearToDateTotal}
          categories={summary.yearToDateByCategory}
          emptyMessage="No investments recorded yet this year."
        />
      </div>

      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Investment transactions</h2>
              <p className="text-sm text-muted-foreground">
                Contributions for {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
            <Link
              href="/transactions"
              className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No investment transactions recorded for this month.
            </p>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{tx.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {tx.category ? (
                      <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300">
                        {formatCategoryLabel(
                          tx.category.name,
                          tx.subCategory?.name,
                        )}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {tx.account.name} · {formatDate(tx.date)}
                    </span>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold">
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
