"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { NetWorthSection } from "@/components/dashboard/net-worth-section";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { CategoryBudgetsCard } from "@/components/dashboard/category-budgets-card";
import { RentalIncomeSummaryCard } from "@/components/dashboard/rental-income-summary-card";
import { RecurringDashboardNudge } from "@/components/recurring/recurring-dashboard-nudge";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { PageError, PageLoading } from "@/components/shared/async-state";
import { MonthPicker } from "@/components/shared/month-picker";
import { api } from "@/lib/api";
import { getApiErrorMessage, logApiError, toastApiError } from "@/lib/api-error";
import {
  balanceTrendsMapFromResponses,
  buildCashFlowChartSeries,
  buildNetWorthChartSeries,
  DashboardChartRange,
  getChartMonthSequence,
  getComparisonMonths,
  trendsMapFromResponses,
} from "@/lib/dashboard-analytics";
import { getCurrentPeriod } from "@/lib/format";
import {
  AccountBalanceTrend,
  BudgetOverview,
  MonthlySummary,
  RecurringTransaction,
  RentalIncomeSummary,
  Transaction,
  YearlyTrendPoint,
} from "@/types";

export function DashboardPageClient() {
  const [{ year, month }, setPeriod] = useState(getCurrentPeriod);
  const [chartRange, setChartRange] = useState<DashboardChartRange>("ytd");
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [previousMonthSummary, setPreviousMonthSummary] =
    useState<MonthlySummary | null>(null);
  const [sameMonthLastYearSummary, setSameMonthLastYearSummary] =
    useState<MonthlySummary | null>(null);
  const [yearlyTrends, setYearlyTrends] = useState<
    Record<number, YearlyTrendPoint[]>
  >({});
  const [balanceTrends, setBalanceTrends] = useState<
    Record<number, AccountBalanceTrend>
  >({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rentalSummary, setRentalSummary] = useState<RentalIncomeSummary | null>(
    null,
  );
  const [budgetOverview, setBudgetOverview] = useState<BudgetOverview | null>(
    null,
  );
  const [recurringItems, setRecurringItems] = useState<RecurringTransaction[]>([]);
  const [partialWarnings, setPartialWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const { previousMonth, sameMonthLastYear } = getComparisonMonths(year, month);

    setLoading(true);
    setLoadError(null);
    setPartialWarnings([]);
    setSummary(null);
    setPreviousMonthSummary(null);
    setSameMonthLastYearSummary(null);
    setYearlyTrends({});
    setBalanceTrends({});
    setTransactions([]);
    setRentalSummary(null);
    setBudgetOverview(null);
    setRecurringItems([]);

    try {
      const [
        summaryResult,
        previousMonthResult,
        sameMonthLastYearResult,
        txResult,
        rentalResult,
        budgetResult,
        recurringResult,
        currentYearTrendResult,
        previousYearTrendResult,
        currentYearBalanceResult,
        previousYearBalanceResult,
      ] = await Promise.allSettled([
        api.transactions.monthlySummary(year, month),
        api.transactions.monthlySummary(previousMonth.year, previousMonth.month),
        api.transactions.monthlySummary(
          sameMonthLastYear.year,
          sameMonthLastYear.month,
        ),
        api.transactions.list({ year, month }),
        api.transactions.rentalIncomeSummary(year, month),
        api.budgets.overview(year, month),
        api.recurringTransactions.list(),
        api.transactions.yearlyTrend(year),
        api.transactions.yearlyTrend(year - 1),
        api.accounts.balanceTrend(year),
        api.accounts.balanceTrend(year - 1),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (summaryResult.status !== "fulfilled") {
        const message = getApiErrorMessage(summaryResult.reason);
        setLoadError(message);
        toastApiError("Failed to load dashboard data", summaryResult.reason);
        logApiError("Dashboard summary failed", summaryResult.reason);
        return;
      }

      if (txResult.status !== "fulfilled") {
        const message = getApiErrorMessage(txResult.reason);
        setLoadError(message);
        toastApiError("Failed to load dashboard data", txResult.reason);
        logApiError("Dashboard transactions failed", txResult.reason);
        return;
      }

      const warnings: string[] = [];
      if (previousMonthResult.status === "rejected") {
        warnings.push("Could not load last month comparison");
        logApiError("Dashboard previous month summary failed", previousMonthResult.reason);
      }
      if (sameMonthLastYearResult.status === "rejected") {
        warnings.push("Could not load last year comparison");
        logApiError(
          "Dashboard same month last year summary failed",
          sameMonthLastYearResult.reason,
        );
      }
      if (rentalResult.status === "rejected") {
        warnings.push("Could not load rental income summary");
        logApiError("Dashboard rental summary failed", rentalResult.reason);
      }
      if (budgetResult.status === "rejected") {
        warnings.push("Could not load budget overview");
        logApiError("Dashboard budget overview failed", budgetResult.reason);
      }
      if (recurringResult.status === "rejected") {
        warnings.push("Could not load recurring reminders");
        logApiError("Dashboard recurring load failed", recurringResult.reason);
      }

      const yearlyTrendEntries = [
        {
          year,
          points:
            currentYearTrendResult.status === "fulfilled"
              ? currentYearTrendResult.value
              : null,
        },
        {
          year: year - 1,
          points:
            previousYearTrendResult.status === "fulfilled"
              ? previousYearTrendResult.value
              : null,
        },
      ];

      const balanceTrendEntries = [
        {
          year,
          trend:
            currentYearBalanceResult.status === "fulfilled"
              ? currentYearBalanceResult.value
              : null,
        },
        {
          year: year - 1,
          trend:
            previousYearBalanceResult.status === "fulfilled"
              ? previousYearBalanceResult.value
              : null,
        },
      ];

      if (yearlyTrendEntries.every((entry) => !entry.points)) {
        warnings.push("Could not load cash flow trend");
      }
      if (balanceTrendEntries.every((entry) => !entry.trend)) {
        warnings.push("Could not load net worth trend");
      }

      const nextYearlyTrends: Record<number, YearlyTrendPoint[]> = {};
      for (const entry of yearlyTrendEntries) {
        if (entry.points) {
          nextYearlyTrends[entry.year] = entry.points;
        }
      }

      const nextBalanceTrends: Record<number, AccountBalanceTrend> = {};
      for (const entry of balanceTrendEntries) {
        if (entry.trend) {
          nextBalanceTrends[entry.year] = entry.trend;
        }
      }

      setSummary(summaryResult.value);
      setPreviousMonthSummary(
        previousMonthResult.status === "fulfilled" ? previousMonthResult.value : null,
      );
      setSameMonthLastYearSummary(
        sameMonthLastYearResult.status === "fulfilled"
          ? sameMonthLastYearResult.value
          : null,
      );
      setYearlyTrends(nextYearlyTrends);
      setBalanceTrends(nextBalanceTrends);
      setTransactions(txResult.value);
      setRecurringItems(
        recurringResult.status === "fulfilled" ? recurringResult.value : [],
      );
      setRentalSummary(
        rentalResult.status === "fulfilled" ? rentalResult.value : null,
      );
      setBudgetOverview(
        budgetResult.status === "fulfilled" ? budgetResult.value : null,
      );
      setPartialWarnings(warnings);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load dashboard data", error);
      logApiError("Dashboard load failed", error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [year, month]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const cashFlowChartData = useMemo(() => {
    const sequence = getChartMonthSequence(year, month, chartRange);
    const trendsByYear = trendsMapFromResponses(
      Object.entries(yearlyTrends).map(([trendYear, points]) => ({
        year: Number(trendYear),
        points,
      })),
    );
    return buildCashFlowChartSeries(sequence, trendsByYear);
  }, [year, month, chartRange, yearlyTrends]);

  const netWorthChartData = useMemo(() => {
    const sequence = getChartMonthSequence(year, month, chartRange);
    const trendsByYear = balanceTrendsMapFromResponses(
      Object.entries(balanceTrends).map(([trendYear, trend]) => ({
        year: Number(trendYear),
        trend,
      })),
    );
    return buildNetWorthChartSeries(sequence, trendsByYear);
  }, [year, month, chartRange, balanceTrends]);

  const hasNetWorthTrend = Object.keys(balanceTrends).length > 0;

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

      {partialWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          {partialWarnings.join(". ")}.
        </div>
      )}

      <RecurringDashboardNudge
        year={year}
        month={month}
        recurringItems={recurringItems}
      />

      <StatsCards
        summary={summary}
        previousMonthSummary={previousMonthSummary}
        sameMonthLastYearSummary={sameMonthLastYearSummary}
      />

      {hasNetWorthTrend ? (
        <NetWorthSection
          data={netWorthChartData}
          range={chartRange}
          onRangeChange={setChartRange}
          selectedYear={year}
          selectedMonth={month}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MonthlyChart
            data={cashFlowChartData}
            range={chartRange}
            onRangeChange={setChartRange}
          />
        </div>
        <div className="space-y-6">
          <CategoryBudgetsCard
            year={year}
            month={month}
            overview={budgetOverview}
            onChanged={loadData}
          />
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
