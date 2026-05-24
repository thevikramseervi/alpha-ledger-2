"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AllocationDonutChart } from "@/components/shared/allocation-donut-chart";
import { formatCurrency } from "@/lib/format";
import { ReportsOverview } from "@/types";

interface ReportsTagsTabProps {
  overview: ReportsOverview;
}

export function ReportsTagsTab({ overview }: ReportsTagsTabProps) {
  const tags = overview.tags;
  const totalTagged = tags.reduce((sum, item) => sum + item.total, 0);

  if (tags.length === 0) {
    return (
      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex min-h-[240px] items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">
            No tagged transactions in this period. Add tags on the Transactions page or
            create labels on the Tags page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tag breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            {totalTagged > 0
              ? `${formatCurrency(totalTagged)} attributed across tagged transactions`
              : "Tagged transaction totals for the selected period"}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <AllocationDonutChart
            slices={tags.map((item) => ({
              id: item.tagId,
              name: item.tagName,
              value: item.total,
              color: item.color,
            }))}
            emptyMessage="No tagged activity in this period."
          />

          <div className="space-y-2">
            {tags.map((item) => {
              const share = totalTagged > 0 ? (item.total / totalTagged) * 100 : 0;

              return (
                <div
                  key={item.tagId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/20 px-3 py-2.5 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate font-medium">{item.tagName}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.count} txn{item.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="font-medium">{formatCurrency(item.total)}</p>
                    <p className="text-xs text-muted-foreground">{share.toFixed(0)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
