"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { logApiError, toastApiError } from "@/lib/api-error";
import {
  formatCategoryLabel,
  formatCurrency,
  formatTransferLabel,
  MONTH_NAMES,
  TRANSACTION_TYPE_BG,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/format";
import { getRecurringPendingItems } from "@/lib/recurring-transactions";
import { cn } from "@/lib/utils";
import { RecurringTransaction } from "@/types";

interface RecurringReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  recurringItems: RecurringTransaction[];
  onChanged: () => Promise<void>;
}

export function RecurringReviewSheet({
  open,
  onOpenChange,
  year,
  month,
  recurringItems,
  onChanged,
}: RecurringReviewSheetProps) {
  const [postingId, setPostingId] = useState<string | null>(null);
  const [postingAll, setPostingAll] = useState(false);

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const pendingItems = getRecurringPendingItems(recurringItems, year, month);

  const renderSummary = (recurring: RecurringTransaction) => {
    if (recurring.type === "TRANSFER" && recurring.toAccount) {
      return formatTransferLabel(recurring.account.name, recurring.toAccount.name);
    }

    if (recurring.category) {
      return formatCategoryLabel(
        recurring.category.name,
        recurring.subCategory?.name,
      );
    }

    return recurring.account.name;
  };

  const handlePost = async (recurring: RecurringTransaction) => {
    setPostingId(recurring.id);
    try {
      await api.recurringTransactions.post(recurring.id, year, month);
      toast.success(`Added "${recurring.description}"`);
      await onChanged();
    } catch (error) {
      toastApiError("Failed to post recurring item", error);
      logApiError("Recurring post failed", error);
    } finally {
      setPostingId(null);
    }
  };

  const handlePostAll = async () => {
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
      onOpenChange(false);
    } catch (error) {
      if (posted > 0) {
        await onChanged();
      }
      toastApiError(
        posted > 0
          ? `Posted ${posted} of ${pendingItems.length} — fix the error and retry the rest`
          : "Failed to post recurring items",
        error,
      );
      logApiError("Recurring post all failed", error);
    } finally {
      setPostingAll(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-5 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <CalendarClock className="h-4 w-4 text-primary" />
            </div>
            <SheetTitle>Due for {monthLabel}</SheetTitle>
          </div>
          <SheetDescription>
            Review and post recurring templates as transactions for this month.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
          <p className="text-sm text-muted-foreground">
            {pendingItems.length} item{pendingItems.length === 1 ? "" : "s"} ready
          </p>
          <Button
            size="sm"
            disabled={pendingItems.length === 0 || postingAll || postingId !== null}
            onClick={() => void handlePostAll()}
          >
            {postingAll ? "Posting..." : "Post all"}
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {pendingItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
              <Check className="mx-auto mb-2 h-5 w-5 text-emerald-400" />
              <p className="text-sm font-medium">All caught up</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Every active template is posted for {monthLabel}.
              </p>
            </div>
          ) : (
            pendingItems.map((recurring) => (
              <div
                key={recurring.id}
                className="rounded-xl border border-border/50 bg-card/30 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{recurring.description}</p>
                  <Badge
                    variant="outline"
                    className={TRANSACTION_TYPE_BG[recurring.type]}
                  >
                    {TRANSACTION_TYPE_LABELS[recurring.type]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCurrency(recurring.amount)} · day {recurring.dayOfMonth} ·{" "}
                  {renderSummary(recurring)}
                </p>
                <Button
                  className="mt-3 w-full sm:w-auto"
                  size="sm"
                  disabled={postingAll || postingId === recurring.id}
                  onClick={() => void handlePost(recurring)}
                >
                  {postingId === recurring.id ? "Posting..." : "Post for this month"}
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border/60 px-5 py-4">
          <Link
            href="/recurring"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Manage recurring templates
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
