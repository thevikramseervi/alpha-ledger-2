"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountBalanceSummary } from "@/types";
import { formatChartAxis, formatCurrency } from "@/lib/format";
import { chartAxisTick, chartTooltipStyle } from "@/lib/chart-theme";
import { AllocationDonutChart } from "@/components/shared/allocation-donut-chart";

interface AccountBalanceChartProps {
  balanceSummary: AccountBalanceSummary;
  periodLabel: string;
}

export function AccountBalanceChart({
  balanceSummary,
  periodLabel,
}: AccountBalanceChartProps) {
  const activeAccounts = balanceSummary.accounts.filter(
    (item) => item.existedDuringPeriod && item.closing > 0,
  );

  const slices = activeAccounts.map((item) => ({
    id: item.accountId,
    name: item.accountName,
    value: item.closing,
    color: item.color,
  }));

  const barData = activeAccounts
    .map((item) => ({
      id: item.accountId,
      name: item.accountName,
      closing: item.closing,
      netChange: item.netChange,
      color: item.color,
    }))
    .sort((a, b) => b.closing - a.closing);

  if (activeAccounts.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Balance mix</CardTitle>
          <p className="text-sm text-muted-foreground">
            Share of total closing balance in {periodLabel}
          </p>
        </CardHeader>
        <CardContent>
          <AllocationDonutChart slices={slices} height={240} />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">By account</CardTitle>
          <p className="text-sm text-muted-foreground">
            Closing balance per account for {periodLabel}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  tick={chartAxisTick}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatChartAxis}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value, name) => {
                    if (name === "closing") {
                      return [formatCurrency(Number(value)), "Closing"];
                    }
                    return [formatCurrency(Number(value)), "Net change"];
                  }}
                />
                <Bar dataKey="closing" radius={[0, 4, 4, 0]}>
                  {barData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
