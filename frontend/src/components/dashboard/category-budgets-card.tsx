"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import { api } from "@/lib/api";
import { toastApiError } from "@/lib/api-error";
import { formatCurrency, MONTH_NAMES } from "@/lib/format";
import { BudgetOverview } from "@/types";

interface CategoryBudgetsCardProps {
  year: number;
  month: number;
  overview: BudgetOverview | null;
  onChanged: () => Promise<void>;
}

export function CategoryBudgetsCard({
  year,
  month,
  overview,
  onChanged,
}: CategoryBudgetsCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!overview || !dialogOpen) {
      return;
    }

    const nextAmounts: Record<string, string> = {};
    for (const category of overview.expenseCategories) {
      nextAmounts[category.categoryId] =
        category.budget !== null ? String(category.budget) : "";
    }
    setAmounts(nextAmounts);
  }, [overview, dialogOpen]);

  const handleSave = async () => {
    if (!overview) {
      return;
    }

    setSaving(true);
    try {
      const budgets = overview.expenseCategories.map((category) => ({
        categoryId: category.categoryId,
        amount: Number(amounts[category.categoryId] || 0),
      }));

      await api.budgets.sync({ year, month, budgets });
      toast.success("Budgets saved");
      setDialogOpen(false);
      await onChanged();
    } catch (error) {
      toastApiError("Failed to save budgets", error);
    } finally {
      setSaving(false);
    }
  };

  if (!overview) {
    return null;
  }

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  return (
    <>
      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base font-semibold">Budgets</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Manage
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {overview.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No budgets set for {monthLabel}. Click Manage to add monthly limits
              for expense categories.
            </p>
          ) : (
            overview.items.map((item) => {
              const overBudget = item.spent > item.budget;
              const progressValue = Math.min(item.percentUsed, 100);

              return (
                <div key={item.categoryId} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium">
                        {item.categoryName}
                      </span>
                      {overBudget ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Over
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-sm tabular-nums">
                      <span className={overBudget ? "font-medium text-destructive" : "font-medium"}>
                        {formatCurrency(item.spent)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        / {formatCurrency(item.budget)}
                      </span>
                    </span>
                  </div>
                  <Progress value={progressValue} className="h-2">
                    <ProgressTrack className="h-2 bg-muted/50">
                      <ProgressIndicator
                        className={
                          overBudget ? "bg-destructive" : "bg-primary"
                        }
                      />
                    </ProgressTrack>
                  </Progress>
                  <p className="text-xs text-muted-foreground">
                    {overBudget
                      ? `${formatCurrency(Math.abs(item.remaining))} over budget`
                      : `${formatCurrency(item.remaining)} remaining`}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(90dvh,680px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>Manage budgets</DialogTitle>
            <DialogDescription>
              Set monthly spending limits for expense categories in {monthLabel}.
              Leave blank or zero to remove a budget.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto px-4 py-4">
            {overview.expenseCategories.map((category) => (
              <div key={category.categoryId} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor={`budget-${category.categoryId}`}
                    className="flex items-center gap-2 font-normal"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.categoryName}
                  </Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Spent {formatCurrency(category.spent)}
                  </span>
                </div>
                <Input
                  id={`budget-${category.categoryId}`}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="No budget"
                  value={amounts[category.categoryId] ?? ""}
                  onChange={(event) =>
                    setAmounts((current) => ({
                      ...current,
                      [category.categoryId]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <DialogFooter className="border-t px-4 py-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save budgets"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
