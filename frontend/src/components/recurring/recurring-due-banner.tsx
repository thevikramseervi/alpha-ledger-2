"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { logApiError, toastApiError } from "@/lib/api-error";
import { getRecurringPendingCount, getRecurringPendingItems } from "@/lib/recurring-transactions";
import { MONTH_NAMES } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RecurringTransaction } from "@/types";
import { RecurringReviewSheet } from "./recurring-review-sheet";

interface RecurringDueBannerProps {
  year: number;
  month: number;
  recurringItems: RecurringTransaction[];
  onChanged: () => Promise<void>;
  defaultReviewOpen?: boolean;
}

export function RecurringDueBanner({
  year,
  month,
  recurringItems,
  onChanged,
  defaultReviewOpen = false,
}: RecurringDueBannerProps) {
  const [reviewOpen, setReviewOpen] = useState(defaultReviewOpen);
  const [postingAll, setPostingAll] = useState(false);
  const pendingCount = getRecurringPendingCount(recurringItems, year, month);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  useEffect(() => {
    if (defaultReviewOpen) {
      setReviewOpen(true);
    }
  }, [defaultReviewOpen]);

  const handlePostAll = async () => {
    const pendingItems = getRecurringPendingItems(recurringItems, year, month);
    if (pendingItems.length === 0 || postingAll) {
      return;
    }

    setPostingAll(true);
    let posted = 0;

    try {
      for (const item of pendingItems) {
        await api.recurringTransactions.post(item.id, year, month);
        posted += 1;
      }
      toast.success(
        `Posted ${posted} recurring item${posted === 1 ? "" : "s"} for ${monthLabel}`,
      );
      await onChanged();
    } catch (error) {
      if (posted > 0) {
        await onChanged();
      }
      toastApiError(
        posted > 0
          ? `Posted ${posted} of ${pendingItems.length} — open Review for the rest`
          : "Failed to post recurring items",
        error,
      );
      logApiError("Recurring post all failed", error);
    } finally {
      setPostingAll(false);
    }
  };

  if (pendingCount === 0) {
    return (
      <RecurringReviewSheet
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        year={year}
        month={month}
        recurringItems={recurringItems}
        onChanged={onChanged}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card/40 to-transparent px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
            <CalendarClock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {pendingCount} recurring item{pendingCount === 1 ? "" : "s"} due for{" "}
              {monthLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              Post salary, rent, SIP, and other monthly templates to your ledger.
            </p>
          </div>
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
            Review
          </Button>
          <Button
            size="sm"
            disabled={postingAll}
            onClick={() => void handlePostAll()}
          >
            {postingAll ? "Posting..." : "Post all"}
          </Button>
        </div>
      </div>

      <RecurringReviewSheet
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        year={year}
        month={month}
        recurringItems={recurringItems}
        onChanged={onChanged}
      />
    </>
  );
}
