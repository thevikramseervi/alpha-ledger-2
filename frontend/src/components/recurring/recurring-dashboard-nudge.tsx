"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { getRecurringPendingCount } from "@/lib/recurring-transactions";
import { MONTH_NAMES } from "@/lib/format";
import { RecurringTransaction } from "@/types";

interface RecurringDashboardNudgeProps {
  year: number;
  month: number;
  recurringItems: RecurringTransaction[];
}

export function RecurringDashboardNudge({
  year,
  month,
  recurringItems,
}: RecurringDashboardNudgeProps) {
  const pendingCount = getRecurringPendingCount(recurringItems, year, month);

  if (pendingCount === 0) {
    return null;
  }

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const href = `/transactions?year=${year}&month=${month}&recurring=review`;

  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card/30 to-transparent px-4 py-3.5 transition-colors hover:border-primary/30 hover:bg-primary/10"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
          <CalendarClock className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">
            {pendingCount} recurring item{pendingCount === 1 ? "" : "s"} not posted for{" "}
            {monthLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            Review and post monthly templates to keep your ledger up to date.
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
        Review
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
