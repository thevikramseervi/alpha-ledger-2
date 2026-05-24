"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatChartAxis, formatCurrency } from "@/lib/format";
import { formatReportsMonthLabel, reportsMonthsNeedYearLabels } from "@/lib/reports-format";
import { chartAxisTick, chartTooltipStyle, CHART_COLORS } from "@/lib/chart-theme";
import { ReportsOverview } from "@/types";

interface ReportsBudgetsTabProps {
  overview: ReportsOverview;
}

export function ReportsBudgetsTab({ overview }: ReportsBudgetsTabProps) {
  const showYear = reportsMonthsNeedYearLabels(overview.months);
  const monthsWithBudgets = overview.budgets.filter(
    (entry) => entry.categoriesWithBudget > 0,
  );

  const chartData = overview.budgets.map((entry) => ({
    label: formatReportsMonthLabel(entry, showYear),
    hitRate: entry.hitRate ?? 0,
    budgetTotal: entry.budgetTotal,
    spentTotal: entry.spentTotal,
    hasBudget: entry.categoriesWithBudget > 0,
  }));

  const averageHitRate =
    monthsWithBudgets.length > 0
      ? monthsWithBudgets.reduce((sum, entry) => sum + (entry.hitRate ?? 0), 0) /
        monthsWithBudgets.length
      : null;

  const latestWithBudget = [...overview.budgets]
    .reverse()
    .find((entry) => entry.categoriesWithBudget > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/40">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Months with budgets</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {monthsWithBudgets.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/40">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Average on-track rate</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-400">
              {averageHitRate !== null ? `${averageHitRate.toFixed(0)}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/40">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Latest month spent</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {latestWithBudget
                ? formatCurrency(latestWithBudget.spentTotal)
                : "—"}
            </p>
            {latestWithBudget ? (
              <p className="text-xs text-muted-foreground">
                of {formatCurrency(latestWithBudget.budgetTotal)} budgeted
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Budget hit rate</CardTitle>
          <p className="text-sm text-muted-foreground">
            Share of budgeted categories that stayed on or under limit each month
          </p>
        </CardHeader>
        <CardContent>
          {monthsWithBudgets.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No budgets set in this period. Add budgets from the Dashboard.
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.filter((entry) => entry.hasBudget)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="label"
                    tick={chartAxisTick}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={chartAxisTick}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value, name) => {
                      if (name === "hitRate") {
                        return [`${Number(value).toFixed(1)}%`, "On track"];
                      }
                      return [formatCurrency(Number(value)), String(name)];
                    }}
                  />
                  <Bar
                    dataKey="hitRate"
                    fill={CHART_COLORS.income}
                    radius={[6, 6, 0, 0]}
                    name="hitRate"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Monthly budget summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.budgets.map((entry) => (
            <div
              key={`${entry.year}-${entry.month}`}
              className="flex flex-col gap-1 rounded-xl border border-border/50 bg-background/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {formatReportsMonthLabel(entry, showYear)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {entry.categoriesWithBudget > 0
                    ? `${entry.categoriesOnTrack} of ${entry.categoriesWithBudget} categories on track`
                    : "No budgets configured"}
                </p>
              </div>
              <div className="text-right tabular-nums">
                {entry.categoriesWithBudget > 0 ? (
                  <>
                    <p className="font-medium text-emerald-400">
                      {entry.hitRate?.toFixed(0)}% hit rate
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(entry.spentTotal)} /{" "}
                      {formatCurrency(entry.budgetTotal)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
