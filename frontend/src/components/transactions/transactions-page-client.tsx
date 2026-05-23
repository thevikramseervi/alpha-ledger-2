"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { MonthPicker } from "@/components/shared/month-picker";
import { TransactionForm, TransactionFormValues } from "./transaction-form";
import { TransactionTable } from "./transaction-table";
import { api } from "@/lib/api";
import { getApiErrorMessage, toastApiError } from "@/lib/api-error";
import { getCurrentPeriod, TRANSACTION_TYPE_LABELS } from "@/lib/format";
import { isValidTransactionAmount, trimOptional, trimRequired } from "@/lib/validation";
import { Account, Category, Transaction, TransactionType } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TransactionsPageClient() {
  const [{ year, month }, setPeriod] = useState(getCurrentPeriod);
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    setTransactions([]);

    try {
      const [txData, categoryData, accountData] = await Promise.all([
        api.transactions.list({
          year,
          month,
          type: typeFilter === "ALL" ? undefined : typeFilter,
        }),
        api.categories.list(),
        api.accounts.list(),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setTransactions(txData);
      setCategories(categoryData);
      setAccounts(accountData);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load transactions", error);
      console.error(error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [year, month, typeFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

      if (editing) {
        await api.transactions.update(
          editing.id,
          values.type === "TRANSFER"
            ? {
                ...base,
                toAccountId: values.toAccountId,
                categoryId: null,
                subCategoryId: null,
              }
            : {
                ...base,
                categoryId: values.categoryId,
                subCategoryId: values.subCategoryId ? values.subCategoryId : null,
                toAccountId: null,
              },
        );
        toast.success("Transaction updated");
      } else {
        await api.transactions.create(
          values.type === "TRANSFER"
            ? {
                ...base,
                toAccountId: values.toAccountId,
              }
            : {
                ...base,
                categoryId: values.categoryId,
                subCategoryId: values.subCategoryId || undefined,
              },
        );
        toast.success("Transaction created");
      }

      setDialogOpen(false);
      setEditing(null);
      await loadData();
    } catch (error) {
      toastApiError("Failed to save transaction", error);
      console.error(error);
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
      console.error(error);
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
            Track income, expenses, and investments for the selected month.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setCreateFormKey((current) => current + 1);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add transaction
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <MonthPicker year={year} month={month} onChange={(y, m) => setPeriod({ year: y, month: m })} />
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            if (!value) return;
            setTypeFilter(value as TransactionType | "ALL");
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {(Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[]).map(
              (type) => (
                <SelectItem key={type} value={type}>
                  {TRANSACTION_TYPE_LABELS[type]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageLoading message="Loading transactions..." />
      ) : loadError ? (
        <PageError message={loadError} onRetry={() => void loadData()} />
      ) : (
        <TransactionTable
          transactions={transactions}
          onEdit={(transaction) => {
            setEditing(transaction);
            setDialogOpen(true);
          }}
          onDelete={setDeleteTarget}
        />
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
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.description}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
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
