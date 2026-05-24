"use client";

import { useMemo } from "react";
import { NetWorthSection } from "@/components/dashboard/net-worth-section";
import { formatReportsMonthLabel, getReportsRangeDescription, reportsMonthsNeedYearLabels } from "@/lib/reports-format";
import { ReportsOverview } from "@/types";

interface ReportsNetWorthTabProps {
  overview: ReportsOverview;
}

export function ReportsNetWorthTab({ overview }: ReportsNetWorthTabProps) {
  const showYear = reportsMonthsNeedYearLabels(overview.months);

  const chartData = useMemo(
    () =>
      overview.netWorth.map((point) => ({
        ...point,
        label: formatReportsMonthLabel(point, showYear),
      })),
    [overview.netWorth, showYear],
  );

  return (
    <NetWorthSection
      data={chartData}
      range="12m"
      rangeDescription={getReportsRangeDescription(overview)}
      selectedYear={overview.year}
      selectedMonth={overview.month}
      accountAllocation={overview.accountAllocation}
    />
  );
}
