"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { isValidTransactionAmount } from "@/lib/validation";
import { Category, TransactionType } from "@/types";

export interface TransactionSplitFormValues {
  categoryId: string;
  subCategoryId: string;
  amount: string;
}

interface TransactionSplitEditorProps {
  type: TransactionType;
  categories: Category[];
  totalAmount: string;
  splits: TransactionSplitFormValues[];
  onChange: (splits: TransactionSplitFormValues[]) => void;
}

const emptySplit = (): TransactionSplitFormValues => ({
  categoryId: "",
  subCategoryId: "",
  amount: "",
});

export function sumSplitAmounts(splits: TransactionSplitFormValues[]): number {
  return splits.reduce((sum, split) => {
    const value = Number(split.amount);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

export function TransactionSplitEditor({
  type,
  categories,
  totalAmount,
  splits,
  onChange,
}: TransactionSplitEditorProps) {
  const filteredCategories = categories.filter((category) => category.type === type);
  const splitTotal = sumSplitAmounts(splits);
  const transactionTotal = Number(totalAmount) || 0;
  const remaining = transactionTotal - splitTotal;
  const totalsMatch =
    transactionTotal > 0 && Math.abs(remaining) < 0.01 && splits.length >= 2;

  const updateSplit = (
    index: number,
    patch: Partial<TransactionSplitFormValues>,
  ) => {
    onChange(
      splits.map((split, splitIndex) =>
        splitIndex === index ? { ...split, ...patch } : split,
      ),
    );
  };

  const addSplit = () => {
    onChange([...splits, emptySplit()]);
  };

  const removeSplit = (index: number) => {
    onChange(splits.filter((_, splitIndex) => splitIndex !== index));
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Split categories</Label>
          <p className="text-xs text-muted-foreground">
            Divide this payment across two or more categories.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSplit}>
          <Plus className="mr-2 h-4 w-4" />
          Add line
        </Button>
      </div>

      <div className="space-y-3">
        {splits.map((split, index) => {
          const selectedCategory = filteredCategories.find(
            (category) => category.id === split.categoryId,
          );
          const subCategories = selectedCategory?.subCategories ?? [];

          return (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-border/50 bg-background/40 p-3 sm:grid-cols-[1fr_1fr_120px_auto]"
            >
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={split.categoryId || null}
                  onValueChange={(value) => {
                    if (!value) return;
                    updateSplit(index, { categoryId: value, subCategoryId: "" });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category">
                      {(value) =>
                        value
                          ? filteredCategories.find((category) => category.id === value)
                              ?.name ?? null
                          : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sub-category</Label>
                <Select
                  value={split.subCategoryId || null}
                  onValueChange={(value) => {
                    updateSplit(index, { subCategoryId: value ?? "" });
                  }}
                  disabled={!split.categoryId || subCategories.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Optional">
                      {(value) =>
                        value
                          ? subCategories.find((subCategory) => subCategory.id === value)
                              ?.name ?? null
                          : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subCategories.map((subCategory) => (
                      <SelectItem key={subCategory.id} value={subCategory.id}>
                        {subCategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={split.amount}
                  onChange={(event) =>
                    updateSplit(index, { amount: event.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove split line"
                  disabled={splits.length <= 2}
                  onClick={() => removeSplit(index)}
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Split total: {formatCurrency(splitTotal)}
        </span>
        <span className={totalsMatch ? "text-emerald-400" : "text-amber-400"}>
          {transactionTotal > 0
            ? totalsMatch
              ? "Matches transaction amount"
              : `Remaining: ${formatCurrency(Math.abs(remaining))}${remaining < 0 ? " over" : ""}`
            : "Enter the transaction amount first"}
        </span>
      </div>
    </div>
  );
}

export function createDefaultSplits(): TransactionSplitFormValues[] {
  return [emptySplit(), emptySplit()];
}

export function splitsAreValid(
  splits: TransactionSplitFormValues[],
  totalAmount: string,
): boolean {
  if (splits.length < 2) {
    return false;
  }

  if (!isValidTransactionAmount(totalAmount)) {
    return false;
  }

  const allLinesValid = splits.every(
    (split) =>
      split.categoryId &&
      isValidTransactionAmount(split.amount),
  );

  if (!allLinesValid) {
    return false;
  }

  return Math.abs(sumSplitAmounts(splits) - Number(totalAmount)) < 0.01;
}
