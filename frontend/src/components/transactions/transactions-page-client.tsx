"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageError, PageLoading } from "@/components/shared/async-state";
import { TransactionForm, TransactionFormValues } from "./transaction-form";
import { TransactionFilters } from "./transaction-filters";
import { RecurringDueBanner } from "@/components/recurring/recurring-due-banner";
import { TransactionTable } from "./transaction-table";
import { api } from "@/lib/api";
import { exportTransactionsToCsv } from "@/lib/export-transactions-csv";
import { getApiErrorMessage, logApiError, toastApiError } from "@/lib/api-error";
import { getCurrentPeriod } from "@/lib/format";
import { isValidTransactionAmount, trimOptional, trimRequired } from "@/lib/validation";
import { Account, Category, RecurringTransaction, Tag, Transaction, TransactionType } from "@/types";

const TRANSACTION_TYPES: TransactionType[] = [
  "INCOME",
  "EXPENSE",
  "INVESTMENT",
  "TRANSFER",
];

function parseTypeFilter(value: string | null): TransactionType | "ALL" {
  if (value && TRANSACTION_TYPES.includes(value as TransactionType)) {
    return value as TransactionType;
  }
  return "ALL";
}

function parsePeriodFromParams(
  yearParam: string | null,
  monthParam: string | null,
) {
  const year = Number(yearParam);
  const month = Number(monthParam);
  if (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 1900 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12
  ) {
    return { year, month };
  }
  return null;
}

export function TransactionsPageClient() {
  return (
    <Suspense fallback={<PageLoading message="Loading transactions..." />}>
      <TransactionsPageContent />
    </Suspense>
  );
}

function TransactionsPageContent() {
  const searchParams = useSearchParams();
  const initialPeriod =
    parsePeriodFromParams(
      searchParams.get("year"),
      searchParams.get("month"),
    ) ?? getCurrentPeriod();
  const initialTypeFilter = parseTypeFilter(searchParams.get("type"));
  const openRecurringReview = searchParams.get("recurring") === "review";

  const [{ year, month }, setPeriod] = useState(initialPeriod);
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">(
    initialTypeFilter,
  );
  const [accountFilter, setAccountFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const period = parsePeriodFromParams(
      searchParams.get("year"),
      searchParams.get("month"),
    );
    if (period) {
      setPeriod(period);
    }
    setTypeFilter(parseTypeFilter(searchParams.get("type")));
  }, [searchParams]);

  const usingCustomDateRange = Boolean(fromDate || toDate);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadStaticData = useCallback(async () => {
    try {
      const [recurringData, categoryData, accountData, tagData] = await Promise.all([
        api.recurringTransactions.list(),
        api.categories.list(),
        api.accounts.list(),
        api.tags.list(),
      ]);
      setRecurringItems(recurringData);
      setCategories(categoryData);
      setAccounts(accountData);
      setTags(tagData);
    } catch (error) {
      toastApiError("Failed to load transaction metadata", error);
      logApiError("Transaction metadata load failed", error);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    if (fromDate && toDate && fromDate > toDate) {
      setTransactions([]);
      setLoadError("From date must be on or before to date");
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);

    try {
      const txData = await api.transactions.list({
        ...(usingCustomDateRange
          ? {
              fromDate: fromDate || undefined,
              toDate: toDate || undefined,
            }
          : { year, month }),
        type: typeFilter === "ALL" ? undefined : typeFilter,
        accountId: accountFilter === "ALL" ? undefined : accountFilter,
        categoryId: categoryFilter === "ALL" ? undefined : categoryFilter,
        tagId: tagFilter === "ALL" ? undefined : tagFilter,
        search: searchQuery || undefined,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setTransactions(txData);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load transactions", error);
      logApiError("Transaction list load failed", error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  }, [
    year,
    month,
    typeFilter,
    accountFilter,
    categoryFilter,
    tagFilter,
    searchQuery,
    fromDate,
    toDate,
    usingCustomDateRange,
  ]);

  const loadData = useCallback(async () => {
    await Promise.all([loadStaticData(), loadTransactions()]);
  }, [loadStaticData, loadTransactions]);

  useEffect(() => {
    void loadStaticData();
  }, [loadStaticData]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const hasActiveFilters =
    typeFilter !== "ALL" ||
    accountFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    tagFilter !== "ALL" ||
    searchInput.trim() !== "" ||
    fromDate !== "" ||
    toDate !== "";

  const clearFilters = () => {
    setTypeFilter("ALL");
    setAccountFilter("ALL");
    setCategoryFilter("ALL");
    setTagFilter("ALL");
    setSearchInput("");
    setSearchQuery("");
    setFromDate("");
    setToDate("");
  };

  const handleExport = () => {
    if (loadError) {
      toast.error("Fix the load error before exporting");
      return;
    }

    if (loading || transactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    exportTransactionsToCsv(transactions, {
      year,
      month,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    toast.success(`Exported ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`);
  };

  const handleSubmit = async (values: TransactionFormValues) => {
    if (!values.type || !values.date || !isValidTransactionAmount(values.amount)) {
      return;
    }

    try {
      const base = {
        amount: Number(values.amount),
        type: values.type,
        accountId: values.accountId,
        description: trimRequired(values.description),
        date: values.date,
        notes: trimOptional(values.notes),
      };

      const buildCategoryPayload = () => {
        if (values.splitEnabled && values.splits.length >= 2) {
          return {
            splits: values.splits.map((split) => ({
              categoryId: split.categoryId,
              subCategoryId: split.subCategoryId || undefined,
              amount: Number(split.amount),
            })),
            categoryId: null,
            subCategoryId: null,
          };
        }

        return {
          categoryId: values.categoryId,
          subCategoryId: values.subCategoryId ? values.subCategoryId : null,
          splits: [],
        };
      };

      const tagIds = values.tagIds.length > 0 ? values.tagIds : undefined;

      if (editing) {
        await api.transactions.update(
          editing.id,
          values.type === "TRANSFER"
            ? {
                ...base,
                toAccountId: values.toAccountId,
                categoryId: null,
                subCategoryId: null,
                splits: [],
                tagIds,
              }
            : {
                ...base,
                ...buildCategoryPayload(),
                toAccountId: null,
                tagIds,
              },
        );
        toast.success("Transaction updated");
      } else {
        await api.transactions.create(
          values.type === "TRANSFER"
            ? {
                ...base,
                toAccountId: values.toAccountId,
                tagIds,
              }
            : values.splitEnabled && values.splits.length >= 2
              ? {
                  ...base,
                  splits: values.splits.map((split) => ({
                    categoryId: split.categoryId,
                    subCategoryId: split.subCategoryId || undefined,
                    amount: Number(split.amount),
                  })),
                  tagIds,
                }
              : {
                  ...base,
                  categoryId: values.categoryId,
                  subCategoryId: values.subCategoryId || undefined,
                  tagIds,
                },
        );
        toast.success("Transaction created");
      }

      setDialogOpen(false);
      setEditing(null);
      await loadData();
    } catch (error) {
      toastApiError("Failed to save transaction", error);
      logApiError("Transaction save failed", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    try {
      await api.transactions.delete(deleteTarget.id);
      toast.success("Transaction deleted");
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toastApiError("Failed to delete transaction", error);
      logApiError("Transaction save failed", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Search, filter, and export your ledger. Manage recurring templates on{" "}
            <Link href="/recurring" className="text-primary hover:underline">
              Recurring
            </Link>
            .
          </p>
        </div>
        <Button
          onClick={() => {
            if (accounts.length === 0) {
              toast.error("Create an account on the Accounts page first");
              return;
            }
            setEditing(null);
            setCreateFormKey((current) => current + 1);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add transaction
        </Button>
      </div>

      <RecurringDueBanner
        year={year}
        month={month}
        recurringItems={recurringItems}
        onChanged={loadData}
        defaultReviewOpen={openRecurringReview}
      />

      <TransactionFilters
        year={year}
        month={month}
        onPeriodChange={(y, m) => setPeriod({ year: y, month: m })}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        accountFilter={accountFilter}
        onAccountFilterChange={setAccountFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        accounts={accounts}
        categories={categories}
        tags={tags}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        usingCustomDateRange={usingCustomDateRange}
        onExport={handleExport}
        exportDisabled={loading || !!loadError || transactions.length === 0}
      />

      {initialLoad && loading ? (
        <PageLoading message="Loading transactions..." />
      ) : loadError && transactions.length === 0 ? (
        <PageError message={loadError} onRetry={() => void loadData()} />
      ) : (
        <>
          {loading && (
            <p className="text-sm text-muted-foreground">Updating transactions…</p>
          )}
          {loadError && (
            <p className="text-sm text-destructive">{loadError}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {transactions.length} transaction{transactions.length === 1 ? "" : "s"} found
          </p>
          <TransactionTable
            transactions={transactions}
            onEdit={(transaction) => {
              setEditing(transaction);
              setDialogOpen(true);
            }}
            onDelete={setDeleteTarget}
          />
        </>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="flex max-h-[min(90dvh,680px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border/50 px-5 py-4 pr-12">
            <DialogTitle>
              {editing ? "Edit transaction" : "Add transaction"}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            key={editing?.id ?? createFormKey}
            categories={categories}
            accounts={accounts}
            tags={tags}
            initialData={editing ?? undefined}
            formKey={editing?.id ?? createFormKey}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="break-all font-medium text-foreground line-clamp-2">
                {deleteTarget?.description}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
