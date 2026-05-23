"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Landmark } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { getApiErrorMessage, toastApiError } from "@/lib/api-error";
import { ACCOUNT_TYPE_LABELS, formatCurrency } from "@/lib/format";
import { trimRequired } from "@/lib/validation";
import { Account, AccountType } from "@/types";

interface AccountFormValues {
  name: string;
  type: AccountType;
  initialBalance: string;
  color: string;
}

const defaultFormValues = (): AccountFormValues => ({
  name: "",
  type: "BANK",
  initialBalance: "0",
  color: "#3b82f6",
});

function accountToFormValues(account: Account): AccountFormValues {
  return {
    name: account.name,
    type: account.type,
    initialBalance: String(Number(account.balance)),
    color: account.color,
  };
}

export function AccountsPageClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [values, setValues] = useState<AccountFormValues>(defaultFormValues);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const requestIdRef = useRef(0);

  const loadAccounts = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    setAccounts([]);

    try {
      const data = await api.accounts.list();
      if (requestId !== requestIdRef.current) {
        return;
      }
      setAccounts(data);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load accounts", error);
      console.error(error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const openCreateDialog = () => {
    setEditing(null);
    setValues(defaultFormValues());
    setDialogOpen(true);
  };

  const openEditDialog = (account: Account) => {
    setEditing(account);
    setValues(accountToFormValues(account));
    setDialogOpen(true);
  };

  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance),
    0,
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = trimRequired(values.name);
    if (!name) return;

    setSaving(true);
    try {
      if (editing) {
        await api.accounts.update(editing.id, {
          name,
          type: values.type,
          color: values.color,
        });
        toast.success("Account updated");
      } else {
        await api.accounts.create({
          name,
          type: values.type,
          initialBalance: Number(values.initialBalance) || 0,
          color: values.color,
        });
        toast.success("Account created");
      }

      setDialogOpen(false);
      setEditing(null);
      await loadAccounts();
    } catch (error) {
      toastApiError(editing ? "Failed to update account" : "Failed to create account", error);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    try {
      await api.accounts.delete(deleteTarget.id);
      toast.success("Account deleted");
      setDeleteTarget(null);
      await loadAccounts();
    } catch (error) {
      toastApiError("Failed to delete account", error);
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage where your money lives and track balances automatically.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add account
        </Button>
      </div>

      <Card className="border-border/60 bg-card/50">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">Total balance</p>
            <p className="text-2xl font-semibold tracking-tight">
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
            <Landmark className="h-5 w-5 text-primary" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <PageLoading message="Loading accounts..." />
      ) : loadError ? (
        <PageError message={loadError} onRetry={() => void loadAccounts()} />
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
          <p className="text-sm font-medium">No accounts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your cash and bank accounts to start tracking balances.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className="border-border/60 bg-card/50 backdrop-blur-sm"
            >
              <CardContent className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <Badge variant="outline" className="mt-1">
                        {ACCOUNT_TYPE_LABELS[account.type]}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${account.name}`}
                      onClick={() => openEditDialog(account)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${account.name}`}
                      onClick={() => setDeleteTarget(account)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                  </div>
                </div>
                <p className="text-2xl font-semibold tracking-tight">
                  {formatCurrency(account.balance)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Income adds here · expenses and investments deduct
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit account" : "Add account"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account name</Label>
              <Input
                id="accountName"
                placeholder="e.g. Kotak Savings Account"
                value={values.name}
                onChange={(event) =>
                  setValues((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountType">Type</Label>
              <Select
                value={values.type}
                onValueChange={(value) => {
                  if (!value) return;
                  setValues((current) => ({ ...current, type: value as AccountType }));
                }}
              >
                <SelectTrigger id="accountType" className="w-full">
                  <SelectValue placeholder="Select type">
                    {(value) =>
                      value ? ACCOUNT_TYPE_LABELS[value as AccountType] : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {ACCOUNT_TYPE_LABELS[type]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="initialBalance">Opening balance</Label>
                <Input
                  id="initialBalance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.initialBalance}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      initialBalance: event.target.value,
                    }))
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="accountColor">Color</Label>
              <Input
                id="accountColor"
                type="color"
                value={values.color}
                onChange={(event) =>
                  setValues((current) => ({ ...current, color: event.target.value }))
                }
                className="h-10 w-full cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Create account"}
              </Button>
            </div>
          </form>
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
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? Accounts with transactions cannot be deleted.
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
