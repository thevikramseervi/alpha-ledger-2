"use client";

import { useMemo, useRef, useState } from "react";
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
import { TransactionAmountInput, TransactionAmountInputHandle } from "./transaction-amount-input";
import { TransactionTypeSelector } from "./transaction-type-selector";
import { Account, Category, RecurringTransaction, TransactionType } from "@/types";
import { isValidTransactionAmount, MAX_DESCRIPTION_LENGTH, MAX_NOTES_LENGTH, trimOptional, trimRequired } from "@/lib/validation";

export interface RecurringTransactionFormValues {
  amount: string;
  type: TransactionType | "";
  categoryId: string;
  subCategoryId: string;
  accountId: string;
  toAccountId: string;
  description: string;
  notes: string;
  dayOfMonth: string;
  active: boolean;
}

interface RecurringTransactionFormProps {
  categories: Category[];
  accounts: Account[];
  initialData?: RecurringTransaction;
  formKey?: string | number;
  onSubmit: (values: RecurringTransactionFormValues) => Promise<void>;
  onCancel: () => void;
}

const defaultValues = (): RecurringTransactionFormValues => ({
  amount: "",
  type: "",
  categoryId: "",
  subCategoryId: "",
  accountId: "",
  toAccountId: "",
  description: "",
  notes: "",
  dayOfMonth: "1",
  active: true,
});

function mapInitialData(recurring: RecurringTransaction): RecurringTransactionFormValues {
  return {
    amount: String(Number(recurring.amount)),
    type: recurring.type,
    categoryId: recurring.categoryId ?? "",
    subCategoryId: recurring.subCategoryId ?? "",
    accountId: recurring.accountId,
    toAccountId: recurring.toAccountId ?? "",
    description: recurring.description,
    notes: recurring.notes ?? "",
    dayOfMonth: String(recurring.dayOfMonth),
    active: recurring.active,
  };
}

const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => String(index + 1));

export function RecurringTransactionForm({
  categories,
  accounts,
  initialData,
  formKey,
  onSubmit,
  onCancel,
}: RecurringTransactionFormProps) {
  const [values, setValues] = useState<RecurringTransactionFormValues>(() =>
    initialData ? mapInitialData(initialData) : defaultValues(),
  );
  const [loading, setLoading] = useState(false);
  const amountInputRef = useRef<TransactionAmountInputHandle>(null);
  const isTransfer = values.type === "TRANSFER";

  const filteredCategories = useMemo(
    () =>
      values.type && values.type !== "TRANSFER"
        ? categories.filter((category) => category.type === values.type)
        : [],
    [categories, values.type],
  );

  const selectedCategory = useMemo(
    () => filteredCategories.find((category) => category.id === values.categoryId),
    [filteredCategories, values.categoryId],
  );

  const availableSubCategories = selectedCategory?.subCategories ?? [];
  const hasSubCategories = availableSubCategories.length > 0;
  const destinationAccounts = useMemo(
    () => accounts.filter((account) => account.id !== values.accountId),
    [accounts, values.accountId],
  );

  const accountNameById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const categoryNameById = useMemo(
    () => new Map(filteredCategories.map((category) => [category.id, category.name])),
    [filteredCategories],
  );

  const subCategoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      for (const subCategory of category.subCategories ?? []) {
        map.set(subCategory.id, subCategory.name);
      }
    }
    return map;
  }, [categories]);

  const renderAccountLabel = (value: string | null) =>
    value ? accountNameById.get(value) ?? null : null;

  const renderCategoryLabel = (value: string | null) =>
    value ? categoryNameById.get(value) ?? null : null;

  const renderSubCategoryLabel = (value: string | null) =>
    value ? subCategoryNameById.get(value) ?? null : null;

  const hasValidCategory =
    values.type === "TRANSFER" ||
    filteredCategories.some((category) => category.id === values.categoryId);

  const canSubmit = Boolean(
    values.type &&
      isValidTransactionAmount(values.amount) &&
      trimRequired(values.description) &&
      values.dayOfMonth &&
      (values.type === "TRANSFER"
        ? values.accountId &&
          values.toAccountId &&
          values.accountId !== values.toAccountId
        : values.accountId && values.categoryId && hasValidCategory),
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...values,
        description: trimRequired(values.description),
        notes: trimOptional(values.notes) ?? "",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form key={formKey} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-3">
            <TransactionTypeSelector
              value={values.type}
              onChange={(type) => {
                setValues((current) => ({
                  ...current,
                  type,
                  categoryId: "",
                  subCategoryId: "",
                  toAccountId: type === "TRANSFER" ? current.toAccountId : "",
                }));
                requestAnimationFrame(() => amountInputRef.current?.focus());
              }}
            />

            <TransactionAmountInput
              ref={amountInputRef}
              value={values.amount}
              type={values.type}
              onChange={(amount) =>
                setValues((current) => ({ ...current, amount }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dayOfMonth">Day of month</Label>
            <Select
              value={values.dayOfMonth}
              onValueChange={(value) => {
                if (!value) return;
                setValues((current) => ({ ...current, dayOfMonth: value }));
              }}
            >
              <SelectTrigger id="dayOfMonth" className="w-full">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((day) => (
                  <SelectItem key={day} value={day}>
                    Day {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used when you add this item for a month (e.g. salary on the 1st).
            </p>
          </div>

          {isTransfer ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fromAccount">From account</Label>
                <Select
                  value={values.accountId || null}
                  onValueChange={(value) => {
                    if (!value) return;
                    setValues((current) => ({
                      ...current,
                      accountId: value,
                      toAccountId:
                        current.toAccountId === value ? "" : current.toAccountId,
                    }));
                  }}
                >
                  <SelectTrigger id="fromAccount" className="w-full">
                    <SelectValue placeholder="Select source account">
                      {renderAccountLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toAccount">To account</Label>
                <Select
                  value={values.toAccountId || null}
                  onValueChange={(value) => {
                    if (!value) return;
                    setValues((current) => ({ ...current, toAccountId: value }));
                  }}
                  disabled={!values.accountId}
                >
                  <SelectTrigger id="toAccount" className="w-full">
                    <SelectValue placeholder="Select destination account">
                      {renderAccountLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {destinationAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={values.categoryId || null}
                    onValueChange={(value) => {
                      if (!value) return;
                      setValues((current) => ({
                        ...current,
                        categoryId: value,
                        subCategoryId: "",
                      }));
                    }}
                    disabled={!values.type}
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Select category">
                        {renderCategoryLabel}
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
                  <Label htmlFor="subCategory">Sub-category</Label>
                  <Select
                    value={values.subCategoryId || null}
                    onValueChange={(value) => {
                      setValues((current) => ({
                        ...current,
                        subCategoryId: value ?? "",
                      }));
                    }}
                    disabled={!values.categoryId || !hasSubCategories}
                  >
                    <SelectTrigger id="subCategory" className="w-full">
                      <SelectValue
                        placeholder={
                          !values.categoryId
                            ? "Select a category first"
                            : hasSubCategories
                              ? "Select sub-category"
                              : "No sub-categories available"
                        }
                      >
                        {renderSubCategoryLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubCategories.map((subCategory) => (
                        <SelectItem key={subCategory.id} value={subCategory.id}>
                          {subCategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <Select
                  value={values.accountId || null}
                  onValueChange={(value) => {
                    if (!value) return;
                    setValues((current) => ({ ...current, accountId: value }));
                  }}
                  disabled={!values.type}
                >
                  <SelectTrigger id="account" className="w-full">
                    <SelectValue placeholder="Select account">
                      {renderAccountLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g. Monthly salary, Rent, SIP"
              value={values.description}
              maxLength={MAX_DESCRIPTION_LENGTH}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Additional details"
              value={values.notes}
              maxLength={MAX_NOTES_LENGTH}
              onChange={(event) =>
                setValues((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </div>

          {initialData ? (
            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={values.active}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="active">Active (show in monthly reminders)</Label>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border/50 bg-muted/20 px-5 py-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !canSubmit}>
          {loading ? "Saving..." : initialData ? "Save changes" : "Save recurring"}
        </Button>
      </div>
    </form>
  );
}
