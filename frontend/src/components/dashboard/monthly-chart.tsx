"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CashFlowChartPoint,
  DashboardChartRange,
} from "@/lib/dashboard-analytics";
import { formatChartAxis, formatCurrency } from "@/lib/format";
import { CHART_COLORS, chartAxisTick, chartTooltipStyle } from "@/lib/chart-theme";
import { ChartRangeToggle, getChartRangeDescription } from "./chart-range-toggle";

interface MonthlyChartProps {
  data: CashFlowChartPoint[];
  range: DashboardChartRange;
  onRangeChange?: (range: DashboardChartRange) => void;
  title?: string;
  rangeDescription?: string;
}

const SERIES = [
  { key: "income", label: "Income", color: CHART_COLORS.income },
  { key: "expenses", label: "Expenses", color: CHART_COLORS.expense },
  { key: "investments", label: "Investments", color: CHART_COLORS.investment },
  { key: "netSavings", label: "Net savings", color: CHART_COLORS.netSavings },
] as const;

export function MonthlyChart({
  data,
  range,
  onRangeChange,
  title = "Cash flow",
  rangeDescription,
}: MonthlyChartProps) {
  const hasActivity = data.some(
    (point) =>
      point.income > 0 ||
      point.expenses > 0 ||
      point.investments > 0 ||
      point.netSavings !== 0,
  );

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Income, spending, investments, and net savings ·{" "}
            {rangeDescription ?? getChartRangeDescription(range).toLowerCase()}
          </p>
        </div>
        {onRangeChange ? (
          <ChartRangeToggle value={range} onChange={onRangeChange} />
        ) : null}
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
            No cash flow recorded for this period yet.
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  {SERIES.slice(0, 3).map((series) => (
                    <linearGradient
                      key={series.key}
                      id={`${series.key}Gradient`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor={series.color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={series.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
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
                    const label =
                      SERIES.find((series) => series.key === name)?.label ??
                      String(name);
                    return [formatCurrency(Number(value)), label];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) =>
                    SERIES.find((series) => series.key === value)?.label ?? value
                  }
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke={CHART_COLORS.income}
                  fill="url(#incomeGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke={CHART_COLORS.expense}
                  fill="url(#expenseGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="investments"
                  stroke={CHART_COLORS.investment}
                  fill="url(#investmentGradient)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="netSavings"
                  stroke={CHART_COLORS.netSavings}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CHART_COLORS.netSavings }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
