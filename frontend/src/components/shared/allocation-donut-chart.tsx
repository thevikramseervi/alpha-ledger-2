"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";
import { chartTooltipStyle, getDonutPalette } from "@/lib/chart-theme";

export interface AllocationSlice {
  id: string;
  name: string;
  value: number;
  color?: string;
}

interface AllocationDonutChartProps {
  slices: AllocationSlice[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  emptyMessage?: string;
}

export function AllocationDonutChart({
  slices,
  height = 220,
  innerRadius = 58,
  outerRadius = 82,
  emptyMessage = "No data to chart yet.",
}: AllocationDonutChartProps) {
  const positiveSlices = slices.filter((slice) => slice.value > 0);
  const total = positiveSlices.reduce((sum, slice) => sum + slice.value, 0);

  if (positiveSlices.length === 0 || total <= 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  const palette = getDonutPalette(positiveSlices.length);
  const chartData = positiveSlices.map((slice, index) => ({
    ...slice,
    fill: slice.color ?? palette[index],
    percent: (slice.value / total) * 100,
  }));

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative mx-auto shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              stroke="transparent"
            >
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value, _name, item) => {
                const payload = item.payload as AllocationSlice & {
                  percent: number;
                  fill: string;
                };
                return [
                  `${formatCurrency(Number(value))} (${payload.percent.toFixed(0)}%)`,
                  payload.name,
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Total
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {chartData.map((slice) => (
          <li key={slice.id} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.fill }}
              />
              <span className="truncate">{slice.name}</span>
            </div>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {slice.percent.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
