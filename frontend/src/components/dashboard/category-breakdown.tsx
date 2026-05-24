"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AllocationDonutChart } from "@/components/shared/allocation-donut-chart";
import { MonthlySummary } from "@/types";
import {
  formatCurrency,
  TRANSACTION_TYPE_BG,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/format";

interface CategoryBreakdownProps {
  summary: MonthlySummary;
}

export function CategoryBreakdown({ summary }: CategoryBreakdownProps) {
  const spendingCategories = summary.byCategory.filter(
    (item) => item.type === "EXPENSE" || item.type === "INVESTMENT",
  );
  const totalOutflow = summary.expenses + summary.investments;

  const slices = spendingCategories.map((item) => ({
    id: item.categoryId,
    name: item.categoryName,
    value: item.total,
    color: item.color,
  }));

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Spending by category
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalOutflow > 0
            ? `${formatCurrency(totalOutflow)} out this month`
            : "Expenses and investments combined"}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {spendingCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No spending recorded for this month.
          </p>
        ) : (
          <>
            <AllocationDonutChart
              slices={slices}
              emptyMessage="No spending recorded for this month."
            />
            <div className="space-y-3 border-t border-border/60 pt-4">
              {spendingCategories.map((item) => {
                const percentage =
                  totalOutflow > 0 ? (item.total / totalOutflow) * 100 : 0;

                return (
                  <div
                    key={item.categoryId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate font-medium">{item.categoryName}</span>
                      <Badge
                        variant="outline"
                        className={TRANSACTION_TYPE_BG[item.type]}
                      >
                        {TRANSACTION_TYPE_LABELS[item.type]}
                      </Badge>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <p className="font-medium">{formatCurrency(item.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {percentage.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
