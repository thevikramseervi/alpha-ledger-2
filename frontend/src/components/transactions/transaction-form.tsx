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
import { DateInput, DateInputHandle } from "@/components/shared/date-input";
import { TransactionAmountInput, TransactionAmountInputHandle } from "./transaction-amount-input";
import {
  createDefaultSplits,
  splitsAreValid,
  TransactionSplitEditor,
  TransactionSplitFormValues,
} from "./transaction-split-editor";
import { TransactionTypeSelector } from "./transaction-type-selector";
import { TransactionTagPicker } from "./transaction-tag-picker";
import { Account, Category, Tag, Transaction, TransactionType } from "@/types";
import { splitIsoDate, toIsoDate } from "@/lib/format";
import { isValidTransactionAmount, MAX_DESCRIPTION_LENGTH, MAX_NOTES_LENGTH, trimOptional, trimRequired } from "@/lib/validation";

export interface TransactionFormValues {
  amount: string;
  type: TransactionType | "";
  categoryId: string;
  subCategoryId: string;
  accountId: string;
  toAccountId: string;
  description: string;
  date: string;
  notes: string;
  splitEnabled: boolean;
  splits: TransactionSplitFormValues[];
  tagIds: string[];
}

interface TransactionFormProps {
  categories: Category[];
  accounts: Account[];
  tags?: Tag[];
  initialData?: Transaction;
  formKey?: string | number;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const defaultValues = (): TransactionFormValues => ({
  amount: "",
  type: "",
  categoryId: "",
  subCategoryId: "",
  accountId: "",
  toAccountId: "",
  description: "",
  date: "",
  notes: "",
  splitEnabled: false,
  splits: createDefaultSplits(),
  tagIds: [],
});

function mapInitialData(transaction: Transaction): TransactionFormValues {
  const hasSplits = Boolean(transaction.splits && transaction.splits.length >= 2);

  return {
    amount: String(Number(transaction.amount)),
    type: transaction.type,
    categoryId: transaction.categoryId ?? "",
    subCategoryId: transaction.subCategoryId ?? "",
    accountId: transaction.accountId,
    toAccountId: transaction.toAccountId ?? "",
    description: transaction.description,
    date: (() => {
      const { year, month, day } = splitIsoDate(transaction.date);
      return toIsoDate(year, month, day);
    })(),
    notes: transaction.notes ?? "",
    splitEnabled: hasSplits,
    splits: hasSplits
      ? transaction.splits!.map((split) => ({
          categoryId: split.categoryId,
          subCategoryId: split.subCategoryId ?? "",
          amount: String(Number(split.amount)),
        }))
      : createDefaultSplits(),
    tagIds: transaction.tags?.map((link) => link.tagId) ?? [],
  };
}

export function TransactionForm({
  categories,
  accounts,
  tags = [],
  initialData,
  formKey,
  onSubmit,
  onCancel,
  submitLabel = "Save transaction",
}: TransactionFormProps) {
  const [values, setValues] = useState<TransactionFormValues>(() =>
    initialData ? mapInitialData(initialData) : defaultValues(),
  );
  const [loading, setLoading] = useState(false);
  const amountInputRef = useRef<TransactionAmountInputHandle>(null);
  const dateInputRef = useRef<DateInputHandle>(null);
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
      values.date &&
      isValidTransactionAmount(values.amount) &&
      trimRequired(values.description) &&
      (values.type === "TRANSFER"
        ? values.accountId &&
          values.toAccountId &&
          values.accountId !== values.toAccountId
        : values.accountId &&
          (values.splitEnabled
            ? splitsAreValid(values.splits, values.amount)
            : values.categoryId && hasValidCategory)),
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dateInputRef.current?.commit()) {
      return;
    }

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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80">
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
                  splitEnabled: type === "TRANSFER" ? false : current.splitEnabled,
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

          <DateInput
            ref={dateInputRef}
            id="date"
            value={values.date}
            onChange={(date) => setValues((current) => ({ ...current, date }))}
            showHint={false}
          />

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

              <div className="flex items-center gap-2">
                <input
                  id="splitEnabled"
                  type="checkbox"
                  checked={values.splitEnabled}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      splitEnabled: event.target.checked,
                      splits:
                        event.target.checked && current.splits.length < 2
                          ? createDefaultSplits()
                          : current.splits,
                    }))
                  }
                  disabled={!values.type}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="splitEnabled">Split across categories</Label>
              </div>

              {values.splitEnabled ? (
                values.type ? (
                  <TransactionSplitEditor
                    type={values.type}
                    categories={categories}
                    totalAmount={values.amount}
                    splits={values.splits}
                    onChange={(splits) =>
                      setValues((current) => ({ ...current, splits }))
                    }
                  />
                ) : null
              ) : (
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
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder={
                isTransfer
                  ? "e.g. Move funds to Kotak"
                  : values.splitEnabled
                    ? "e.g. Big Bazaar shopping"
                    : "What was this transaction for?"
              }
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
            <Label>Tags (optional)</Label>
            <TransactionTagPicker
              tags={tags}
              selectedIds={values.tagIds}
              onChange={(tagIds) =>
                setValues((current) => ({
                  ...current,
                  tagIds,
                }))
              }
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
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border/50 bg-muted/20 px-5 py-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !canSubmit}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
