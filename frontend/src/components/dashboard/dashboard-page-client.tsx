"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { RentalIncomeSummaryCard } from "@/components/dashboard/rental-income-summary-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { PageError, PageLoading } from "@/components/shared/async-state";
import { MonthPicker } from "@/components/shared/month-picker";
import { api } from "@/lib/api";
import { getApiErrorMessage, toastApiError } from "@/lib/api-error";
import { getCurrentPeriod } from "@/lib/format";
import { MonthlySummary, RentalIncomeSummary, Transaction, YearlyTrendPoint } from "@/types";

export function DashboardPageClient() {
  const [{ year, month }, setPeriod] = useState(getCurrentPeriod);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [trend, setTrend] = useState<YearlyTrendPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rentalSummary, setRentalSummary] = useState<RentalIncomeSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    setSummary(null);
    setTrend([]);
    setTransactions([]);
    setRentalSummary(null);

    try {
      const [summaryResult, trendResult, txResult, rentalResult] =
        await Promise.allSettled([
          api.transactions.monthlySummary(year, month),
          api.transactions.yearlyTrend(year),
          api.transactions.list({ year, month }),
          api.transactions.rentalIncomeSummary(year, month),
        ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (summaryResult.status !== "fulfilled") {
        const message = getApiErrorMessage(summaryResult.reason);
        setLoadError(message);
        toastApiError("Failed to load dashboard data", summaryResult.reason);
        console.error(summaryResult.reason);
        return;
      }

      if (trendResult.status !== "fulfilled") {
        const message = getApiErrorMessage(trendResult.reason);
        setLoadError(message);
        toastApiError("Failed to load dashboard data", trendResult.reason);
        console.error(trendResult.reason);
        return;
      }

      if (txResult.status !== "fulfilled") {
        const message = getApiErrorMessage(txResult.reason);
        setLoadError(message);
        toastApiError("Failed to load dashboard data", txResult.reason);
        console.error(txResult.reason);
        return;
      }

      setSummary(summaryResult.value);
      setTrend(trendResult.value);
      setTransactions(txResult.value);
      setRentalSummary(
        rentalResult.status === "fulfilled" ? rentalResult.value : null,
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load dashboard data", error);
      console.error(error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [year, month]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Your monthly financial overview
            </p>
          </div>
        </div>
        <PageLoading message="Loading dashboard..." />
      </div>
    );
  }

  if (loadError || !summary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Your monthly financial overview
            </p>
          </div>
        </div>
        <PageError
          message={loadError ?? "Dashboard data is unavailable."}
          onRetry={() => void loadData()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {summary.transactionCount} transactions this month
          </p>
        </div>
        <MonthPicker year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />
      </div>

      <StatsCards summary={summary} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MonthlyChart data={trend} year={year} />
        </div>
        <div className="space-y-6">
          {rentalSummary?.configured ? (
            <RentalIncomeSummaryCard summary={rentalSummary} />
          ) : null}
          <CategoryBreakdown summary={summary} />
        </div>
      </div>

      <RecentTransactions transactions={transactions} />
    </div>
  );
}
