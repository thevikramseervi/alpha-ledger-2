"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AllocationDonutChart } from "@/components/shared/allocation-donut-chart";
import { formatChartAxis, formatCurrency, TRANSACTION_TYPE_BG, TRANSACTION_TYPE_LABELS } from "@/lib/format";
import { formatReportsMonthLabel, reportsMonthsNeedYearLabels } from "@/lib/reports-format";
import { chartAxisTick, chartTooltipStyle } from "@/lib/chart-theme";
import { ReportsOverview } from "@/types";
import { cn } from "@/lib/utils";

interface ReportsCategoriesTabProps {
  overview: ReportsOverview;
}

const TOP_TREND_COUNT = 5;

export function ReportsCategoriesTab({ overview }: ReportsCategoriesTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    overview.categories.totals[0]?.categoryId ?? null,
  );

  const showYear = reportsMonthsNeedYearLabels(overview.months);
  const spendingCategories = overview.categories.totals.filter(
    (item) => item.type === "EXPENSE" || item.type === "INVESTMENT",
  );
  const totalOutflow = spendingCategories.reduce((sum, item) => sum + item.total, 0);

  const topTrendCategories = spendingCategories.slice(0, TOP_TREND_COUNT);

  const trendChartData = useMemo(() => {
    return overview.months.map((monthRef) => {
      const monthData = overview.categories.monthly.find(
        (entry) => entry.year === monthRef.year && entry.month === monthRef.month,
      );
      const row: Record<string, string | number> = {
        label: formatReportsMonthLabel(monthRef, showYear),
      };

      for (const category of topTrendCategories) {
        const value =
          monthData?.totals.find((entry) => entry.categoryId === category.categoryId)
            ?.total ?? 0;
        row[category.categoryId] = value;
      }

      return row;
    });
  }, [overview, topTrendCategories, showYear]);

  const selectedSubCategories = overview.categories.subCategories.filter(
    (item) => item.categoryId === selectedCategoryId,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top categories</CardTitle>
            <p className="text-sm text-muted-foreground">
              {totalOutflow > 0
                ? `${formatCurrency(totalOutflow)} across the selected period`
                : "Expenses and investments combined"}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <AllocationDonutChart
              slices={spendingCategories.map((item) => ({
                id: item.categoryId,
                name: item.categoryName,
                value: item.total,
                color: item.color,
              }))}
              emptyMessage="No category spending in this period."
            />
            <div className="space-y-2">
              {spendingCategories.map((item) => {
                const share = totalOutflow > 0 ? (item.total / totalOutflow) * 100 : 0;
                const isSelected = item.categoryId === selectedCategoryId;

                return (
                  <button
                    key={item.categoryId}
                    type="button"
                    onClick={() => setSelectedCategoryId(item.categoryId)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                      isSelected
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/50 bg-background/20 hover:bg-background/40",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate font-medium">{item.categoryName}</span>
                      <Badge variant="outline" className={TRANSACTION_TYPE_BG[item.type]}>
                        {TRANSACTION_TYPE_LABELS[item.type]}
                      </Badge>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <p className="font-medium">{formatCurrency(item.total)}</p>
                      <p className="text-xs text-muted-foreground">{share.toFixed(0)}%</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Category trends</CardTitle>
            <p className="text-sm text-muted-foreground">
              Top {TOP_TREND_COUNT} categories by month
            </p>
          </CardHeader>
          <CardContent>
            {topTrendCategories.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No category activity in this period.
              </div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
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
                      tickFormatter={formatChartAxis}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value, name) => {
                        const category = topTrendCategories.find(
                          (entry) => entry.categoryId === name,
                        );
                        return [
                          formatCurrency(Number(value)),
                          category?.categoryName ?? String(name),
                        ];
                      }}
                    />
                    <Legend
                      formatter={(value) => {
                        const category = topTrendCategories.find(
                          (entry) => entry.categoryId === value,
                        );
                        return category?.categoryName ?? value;
                      }}
                    />
                    {topTrendCategories.map((category) => (
                      <Line
                        key={category.categoryId}
                        type="monotone"
                        dataKey={category.categoryId}
                        stroke={category.color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Sub-category breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            {selectedCategoryId
              ? overview.categories.totals.find(
                  (item) => item.categoryId === selectedCategoryId,
                )?.categoryName
              : "Select a category above"}
          </p>
        </CardHeader>
        <CardContent>
          {selectedSubCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sub-category splits recorded for this category in the selected period.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedSubCategories.map((item) => {
                const categoryTotal =
                  overview.categories.totals.find(
                    (entry) => entry.categoryId === item.categoryId,
                  )?.total ?? 0;
                const share =
                  categoryTotal > 0 ? (item.total / categoryTotal) * 100 : 0;

                return (
                  <div
                    key={`${item.categoryId}-${item.subCategoryId ?? "none"}`}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{item.subCategoryName}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(item.total)} · {share.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${Math.min(share, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Category totals by month</CardTitle>
        </CardHeader>
        <CardContent>
          {spendingCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for this period.</p>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trendChartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
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
                    tickFormatter={formatChartAxis}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value, name) => {
                      const category = topTrendCategories.find(
                        (entry) => entry.categoryId === name,
                      );
                      return [
                        formatCurrency(Number(value)),
                        category?.categoryName ?? String(name),
                      ];
                    }}
                  />
                  <Legend
                    formatter={(value) => {
                      const category = topTrendCategories.find(
                        (entry) => entry.categoryId === value,
                      );
                      return category?.categoryName ?? value;
                    }}
                  />
                  {topTrendCategories.map((category) => (
                    <Bar
                      key={category.categoryId}
                      dataKey={category.categoryId}
                      stackId="categories"
                      fill={category.color}
                      radius={[0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
