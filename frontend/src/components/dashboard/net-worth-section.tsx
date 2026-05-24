"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DashboardChartRange,
  NetWorthChartPoint,
} from "@/lib/dashboard-analytics";
import { formatChartAxis, formatCurrency, MONTH_NAMES } from "@/lib/format";
import { CHART_COLORS, chartAxisTick, chartTooltipStyle } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";
import { AllocationDonutChart } from "@/components/shared/allocation-donut-chart";
import { ChartRangeToggle, getChartRangeDescription } from "./chart-range-toggle";

interface NetWorthSectionProps {
  data: NetWorthChartPoint[];
  range: DashboardChartRange;
  onRangeChange?: (range: DashboardChartRange) => void;
  selectedYear: number;
  selectedMonth: number;
  rangeDescription?: string;
  accountAllocation?: Array<{
    accountId: string;
    accountName: string;
    color: string;
    closing: number;
    share: number;
  }>;
}

export function NetWorthSection({
  data,
  range,
  onRangeChange,
  selectedYear,
  selectedMonth,
  rangeDescription,
  accountAllocation,
}: NetWorthSectionProps) {
  const selectedPoint =
    data.find(
      (point) => point.year === selectedYear && point.month === selectedMonth,
    ) ?? null;
  const hasHistory = data.some((point) => point.totalClosing > 0);
  const netChange = selectedPoint?.netChange ?? 0;
  const isUp = netChange >= 0;

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <CardTitle className="text-base font-semibold">Net worth</CardTitle>
            <p className="text-sm text-muted-foreground">
              Total balance across all accounts ·{" "}
              {rangeDescription ?? getChartRangeDescription(range).toLowerCase()}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-background/60 p-2 ring-1 ring-border/60">
              <Wallet className="h-4 w-4 text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(selectedPoint?.totalClosing ?? 0)}
              </p>
              {selectedPoint ? (
                <p
                  className={cn(
                    "mt-1 flex items-center gap-1 text-sm tabular-nums",
                    isUp ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {isUp ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {formatCurrency(Math.abs(netChange))} in{" "}
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {onRangeChange ? (
          <ChartRangeToggle value={range} onChange={onRangeChange} />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasHistory ? (
          <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
            Add accounts to see your net worth trend.
          </div>
        ) : (
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.netWorth} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={CHART_COLORS.netWorth} stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  tickFormatter={formatChartAxis}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value, name) => {
                    if (name === "totalClosing") {
                      return [formatCurrency(Number(value)), "Net worth"];
                    }
                    return [formatCurrency(Number(value)), "Net change"];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalClosing"
                  stroke={CHART_COLORS.netWorth}
                  fill="url(#netWorthGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {accountAllocation && accountAllocation.length > 0 ? (
          <div className="grid gap-6 border-t border-border/60 pt-6 lg:grid-cols-2">
            <AllocationDonutChart
              slices={accountAllocation.map((account) => ({
                id: account.accountId,
                name: account.accountName,
                value: account.closing,
                color: account.color,
              }))}
              emptyMessage="No account balances for this period."
            />
            <div className="space-y-3">
              {accountAllocation.map((account) => (
                <div
                  key={account.accountId}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                    <span className="truncate font-medium">{account.accountName}</span>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="font-medium">{formatCurrency(account.closing)}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.share.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
