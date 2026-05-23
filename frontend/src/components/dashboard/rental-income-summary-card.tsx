"use client";

import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RentalIncomeSummary } from "@/types";
import { formatCurrency } from "@/lib/format";

interface RentalIncomeSummaryCardProps {
  summary: RentalIncomeSummary;
}

export function RentalIncomeSummaryCard({
  summary,
}: RentalIncomeSummaryCardProps) {
  if (!summary.configured) {
    return null;
  }

  const topHouses = summary.byHouse.filter((house) => house.total > 0).slice(0, 3);

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-500/10 p-2 ring-1 ring-emerald-500/20">
            <Building2 className="h-4 w-4 text-emerald-400" />
          </div>
          <CardTitle className="text-base font-semibold">Rental Income</CardTitle>
        </div>
        <Link
          href="/rental-income"
          className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          View details
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">This month</p>
          <p className="text-2xl font-semibold tracking-tight">
            {formatCurrency(summary.monthTotal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(summary.yearToDateTotal)} year to date
          </p>
        </div>

        {topHouses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rental income recorded for this month yet.
          </p>
        ) : (
          topHouses.map((house) => {
            const percentage =
              summary.monthTotal > 0
                ? (house.total / summary.monthTotal) * 100
                : 0;

            return (
              <div key={house.subCategoryId ?? house.subCategoryName} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium">
                    {house.subCategoryName}
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(house.total)}
                  </span>
                </div>
                <Progress value={percentage} className="h-2 bg-muted/50" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
