"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { MonthPicker } from "@/components/shared/month-picker";
import { PageError, PageLoading } from "@/components/shared/async-state";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getApiErrorMessage, logApiError, toastApiError } from "@/lib/api-error";
import {
  formatCurrency,
  formatDate,
  getCurrentPeriod,
  MONTH_NAMES,
} from "@/lib/format";
import { RentalIncomeSummary, Transaction } from "@/types";

export function RentalIncomePageClient() {
  const [{ year, month }, setPeriod] = useState(getCurrentPeriod);
  const [summary, setSummary] = useState<RentalIncomeSummary | null>(null);
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
      const summaryData = await api.transactions.rentalIncomeSummary(year, month);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSummary(summaryData);

      if (summaryData.configured && summaryData.categoryId) {
        const txData = await api.transactions.list({
          year,
          month,
          type: "INCOME",
          categoryId: summaryData.categoryId,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        setTransactions(txData);
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load rental income data", error);
      logApiError("API request failed", error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [year, month]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const header = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rental Income</h1>
        <p className="text-sm text-muted-foreground">
          Track rent received from each property
        </p>
      </div>
      <MonthPicker
        year={year}
        month={month}
        onChange={(y, m) => setPeriod({ year: y, month: m })}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <PageLoading message="Loading rental income..." />
      </div>
    );
  }

  if (loadError || !summary) {
    return (
      <div className="space-y-6">
        {header}
        <PageError
          message={loadError ?? "Rental income data is unavailable."}
          onRetry={() => void loadData()}
        />
      </div>
    );
  }

  if (!summary.configured) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Rental Income category not found</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create an income category named &quot;Rental Income&quot; and add your
            houses as sub-categories on the Categories page.
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rental Income</h1>
          <p className="text-sm text-muted-foreground">
            Rent received by property for {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>
        <MonthPicker
          year={year}
          month={month}
          onChange={(y, m) => setPeriod({ year: y, month: m })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="relative overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-60" />
          <CardContent className="relative p-5">
            <p className="text-sm font-medium text-muted-foreground">This month</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {formatCurrency(summary.monthTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.monthTransactionCount} payment
              {summary.monthTransactionCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-500/15 to-transparent opacity-60" />
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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-base font-semibold">By property this month</h2>
              <p className="text-sm text-muted-foreground">
                Breakdown using your house sub-categories
              </p>
            </div>

            {summary.byHouse.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add house sub-categories under Rental Income to track each property.
              </p>
            ) : (
              summary.byHouse.map((house) => {
                const percentage =
                  summary.monthTotal > 0
                    ? (house.total / summary.monthTotal) * 100
                    : 0;

                return (
                  <div
                    key={house.subCategoryId ?? house.subCategoryName}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {house.subCategoryName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {house.count} payment{house.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(house.total)}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2 bg-muted/50" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-base font-semibold">By property year to date</h2>
              <p className="text-sm text-muted-foreground">
                Cumulative rent through {MONTH_NAMES[month - 1]}
              </p>
            </div>

            {summary.yearToDateByHouse.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rental income recorded yet this year.
              </p>
            ) : (
              summary.yearToDateByHouse.map((house) => {
                const percentage =
                  summary.yearToDateTotal > 0
                    ? (house.total / summary.yearToDateTotal) * 100
                    : 0;

                return (
                  <div
                    key={`ytd-${house.subCategoryId ?? house.subCategoryName}`}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {house.subCategoryName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {house.count} payment{house.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(house.total)}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2 bg-muted/50" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Rental payments</h2>
              <p className="text-sm text-muted-foreground">
                Transactions tagged with Rental Income this month
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
              No rental payments recorded for this month.
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
                    {tx.subCategory ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400">
                        {tx.subCategory.name}
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
