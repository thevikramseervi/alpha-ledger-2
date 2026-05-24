"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CHART_RANGE_LABELS,
  DashboardChartRange,
} from "@/lib/dashboard-analytics";

interface ChartRangeToggleProps {
  value: DashboardChartRange;
  onChange: (value: DashboardChartRange) => void;
}

const RANGES: DashboardChartRange[] = ['6m', '12m', 'ytd'];

export function ChartRangeToggle({ value, onChange }: ChartRangeToggleProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (next === '6m' || next === '12m' || next === 'ytd') {
          onChange(next);
        }
      }}
    >
      <TabsList className="h-8">
        {RANGES.map((range) => (
          <TabsTrigger key={range} value={range} className="px-2.5 text-xs sm:text-sm">
            {range === '6m' ? '6M' : range === '12m' ? '12M' : 'YTD'}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function getChartRangeDescription(range: DashboardChartRange) {
  return CHART_RANGE_LABELS[range];
}
