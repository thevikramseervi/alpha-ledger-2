"use client";

import { useMemo } from "react";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { formatReportsMonthLabel, getReportsRangeDescription, reportsMonthsNeedYearLabels } from "@/lib/reports-format";
import { ReportsOverview } from "@/types";

interface ReportsCashFlowTabProps {
  overview: ReportsOverview;
}

export function ReportsCashFlowTab({ overview }: ReportsCashFlowTabProps) {
  const showYear = reportsMonthsNeedYearLabels(overview.months);
  const chartData = useMemo(
    () =>
      overview.cashFlow.map((point) => ({
        ...point,
        label: formatReportsMonthLabel(point, showYear),
      })),
    [overview.cashFlow, showYear],
  );

  const totals = overview.cashFlow.reduce(
    (acc, point) => ({
      income: acc.income + point.income,
      expenses: acc.expenses + point.expenses,
      investments: acc.investments + point.investments,
      netSavings: acc.netSavings + point.netSavings,
    }),
    { income: 0, expenses: 0, investments: 0, netSavings: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total income", value: totals.income, tone: "text-emerald-400" },
          { label: "Total expenses", value: totals.expenses, tone: "text-rose-400" },
          {
            label: "Total investments",
            value: totals.investments,
            tone: "text-indigo-300",
          },
          {
            label: "Net savings",
            value: totals.netSavings,
            tone: totals.netSavings < 0 ? "text-rose-400" : "text-amber-300",
          },
        ].map((item) => (
          <Card key={item.label} className="border-border/60 bg-card/40">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-xl font-semibold tabular-nums ${item.tone}`}>
                {formatCurrency(item.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <MonthlyChart
        data={chartData}
        range="12m"
        rangeDescription={getReportsRangeDescription(overview)}
        title="Cash flow trend"
      />

      <Card className="border-border/60 bg-card/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Monthly net savings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {overview.cashFlow.map((point) => (
            <div
              key={`${point.year}-${point.month}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">
                {formatReportsMonthLabel(point, showYear)}
              </span>
              <span
                className={`font-medium tabular-nums ${
                  point.netSavings < 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {formatCurrency(point.netSavings)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
