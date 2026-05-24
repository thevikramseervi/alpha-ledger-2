"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RecurringTransactionForm,
  RecurringTransactionFormValues,
} from "@/components/transactions/recurring-transaction-form";
import { api } from "@/lib/api";
import { toastApiError, logApiError } from "@/lib/api-error";
import {
  getRecurringPendingCount,
  isRecurringPostedForMonth,
} from "@/lib/recurring-transactions";
import {
  formatCategoryLabel,
  formatCurrency,
  formatTransferLabel,
  MONTH_NAMES,
  TRANSACTION_TYPE_BG,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/format";
import { trimOptional, trimRequired } from "@/lib/validation";
import { Account, Category, RecurringTransaction } from "@/types";

interface RecurringTemplatesPanelProps {
  year: number;
  month: number;
  recurringItems: RecurringTransaction[];
  categories: Category[];
  accounts: Account[];
  onChanged: () => Promise<void>;
}

export function RecurringTemplatesPanel({
  year,
  month,
  recurringItems,
  categories,
  accounts,
  onChanged,
}: RecurringTemplatesPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const pendingCount = getRecurringPendingCount(recurringItems, year, month);
  const activeCount = recurringItems.filter((item) => item.active).length;

  const openCreateDialog = () => {
    setEditing(null);
    setCreateFormKey((current) => current + 1);
    setDialogOpen(true);
  };

  const openEditDialog = (recurring: RecurringTransaction) => {
    setEditing(recurring);
    setDialogOpen(true);
  };

  const buildPayload = (values: RecurringTransactionFormValues) => {
    const base = {
      amount: Number(values.amount),
      type: values.type as RecurringTransaction["type"],
      accountId: values.accountId,
      description: trimRequired(values.description),
      notes: trimOptional(values.notes),
      dayOfMonth: Number(values.dayOfMonth),
    };

    if (values.type === "TRANSFER") {
      return {
        ...base,
        toAccountId: values.toAccountId,
      };
    }

    return {
      ...base,
      categoryId: values.categoryId,
      subCategoryId: values.subCategoryId || undefined,
    };
  };

  const handleSubmit = async (values: RecurringTransactionFormValues) => {
    if (!values.type) {
      return;
    }

    try {
      if (editing) {
        const payload = buildPayload(values);
        await api.recurringTransactions.update(editing.id, {
          ...payload,
          active: values.active,
          ...(values.type === "TRANSFER"
            ? { categoryId: null, subCategoryId: null }
            : { toAccountId: null }),
        });
        toast.success("Recurring item updated");
      } else {
        await api.recurringTransactions.create(buildPayload(values));
        toast.success("Recurring item saved");
      }

      setDialogOpen(false);
      setEditing(null);
      await onChanged();
    } catch (error) {
      toastApiError("Failed to save recurring item", error);
      logApiError("Recurring transaction action failed", error);
    }
  };

  const handlePost = async (recurring: RecurringTransaction) => {
    setPostingId(recurring.id);
    try {
      await api.recurringTransactions.post(recurring.id, year, month);
      toast.success(`Added "${recurring.description}" for ${monthLabel}`);
      await onChanged();
    } catch (error) {
      toastApiError("Failed to add recurring transaction", error);
      logApiError("Recurring transaction action failed", error);
    } finally {
      setPostingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);
    try {
      await api.recurringTransactions.delete(deleteTarget.id);
      toast.success("Recurring item deleted");
      setDeleteTarget(null);
      await onChanged();
    } catch (error) {
      toastApiError("Failed to delete recurring item", error);
      logApiError("Recurring transaction action failed", error);
    } finally {
      setDeleting(false);
    }
  };

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

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{recurringItems.length} template{recurringItems.length === 1 ? "" : "s"}</span>
          <span aria-hidden="true">·</span>
          <span>{activeCount} active</span>
          {pendingCount > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-primary">{pendingCount} due for {monthLabel}</span>
            </>
          ) : null}
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New recurring
        </Button>
      </div>

      {recurringItems.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/20">
          <CardContent className="px-4 py-12 text-center">
            <p className="text-sm font-medium">No recurring templates yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save salary, rent, SIP, and other monthly items once — then post them
              each month from Transactions or here.
            </p>
            <Button className="mt-4" variant="outline" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recurringItems.map((recurring) => {
            const posted = isRecurringPostedForMonth(recurring, year, month);

            return (
              <Card
                key={recurring.id}
                className="border-border/60 bg-card/30 transition-colors hover:bg-card/45"
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{recurring.description}</p>
                      <Badge
                        variant="outline"
                        className={TRANSACTION_TYPE_BG[recurring.type]}
                      >
                        {TRANSACTION_TYPE_LABELS[recurring.type]}
                      </Badge>
                      {!recurring.active ? (
                        <Badge variant="outline">Paused</Badge>
                      ) : posted ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-emerald-400"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Posted for {monthLabel}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(recurring.amount)} · day {recurring.dayOfMonth} ·{" "}
                      {renderSummary(recurring)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={posted ? "outline" : "default"}
                      onClick={() => void handlePost(recurring)}
                      disabled={
                        !recurring.active || posted || postingId === recurring.id
                      }
                    >
                      {postingId === recurring.id
                        ? "Posting..."
                        : posted
                          ? "Posted"
                          : `Post for ${MONTH_NAMES[month - 1]}`}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Edit ${recurring.description}`}
                      onClick={() => openEditDialog(recurring)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Delete ${recurring.description}`}
                      onClick={() => setDeleteTarget(recurring)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
              {editing ? "Edit recurring template" : "New recurring template"}
            </DialogTitle>
            <DialogDescription>
              Templates are not transactions until you post them for a month.
            </DialogDescription>
          </DialogHeader>
          <RecurringTransactionForm
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
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete recurring template</DialogTitle>
            <DialogDescription>
              Delete{" "}
              <span className="break-all font-medium text-foreground line-clamp-2">
                {deleteTarget?.description}
              </span>
              ? Transactions already posted from this template will stay in your ledger.
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
    </>
  );
}
