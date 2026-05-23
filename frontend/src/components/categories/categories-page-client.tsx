"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Tags, ListTree } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getApiErrorMessage, toastApiError } from "@/lib/api-error";
import { trimOptional, trimRequired } from "@/lib/validation";
import {
  CATEGORY_TYPES,
  DEFAULT_CATEGORY_COLOR,
  TRANSACTION_TYPE_BG,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/format";
import { Category, SubCategory, TransactionType } from "@/types";

type CategoryFormType = (typeof CATEGORY_TYPES)[number];

interface CategoryFormValues {
  name: string;
  type: CategoryFormType;
  color: string;
  icon: string;
}

const defaultFormValues = (): CategoryFormValues => ({
  name: "",
  type: "EXPENSE",
  color: DEFAULT_CATEGORY_COLOR.EXPENSE,
  icon: "",
});

function categoryToFormValues(category: Category): CategoryFormValues {
  return {
    name: category.name,
    type: category.type as CategoryFormType,
    color: category.color,
    icon: category.icon ?? "",
  };
}

export function CategoriesPageClient() {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [typeFilter, setTypeFilter] = useState<CategoryFormType | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [values, setValues] = useState<CategoryFormValues>(defaultFormValues);
  const [saving, setSaving] = useState(false);
  const requestIdRef = useRef(0);
  const [subCategoryTarget, setSubCategoryTarget] = useState<Category | null>(
    null,
  );
  const [subCategoryName, setSubCategoryName] = useState("");
  const [editingSubCategory, setEditingSubCategory] =
    useState<SubCategory | null>(null);
  const [deleteSubCategoryTarget, setDeleteSubCategoryTarget] =
    useState<SubCategory | null>(null);
  const [subCategorySaving, setSubCategorySaving] = useState(false);
  const [deletingSubCategory, setDeletingSubCategory] = useState(false);

  const categories = useMemo(
    () =>
      typeFilter === "ALL"
        ? allCategories
        : allCategories.filter((category) => category.type === typeFilter),
    [allCategories, typeFilter],
  );

  const loadCategories = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);

    try {
      const data = await api.categories.list();
      if (requestId !== requestIdRef.current) {
        return data;
      }
      setAllCategories(data);
      return data;
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return [];
      }
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load categories", error);
      console.error(error);
      return [];
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const openCreateDialog = () => {
    setEditing(null);
    setValues(defaultFormValues());
    setDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditing(category);
    setValues(categoryToFormValues(category));
    setDialogOpen(true);
  };

  const totals = useMemo(
    () => ({
      income: allCategories.filter((c) => c.type === "INCOME").length,
      expense: allCategories.filter((c) => c.type === "EXPENSE").length,
      investment: allCategories.filter((c) => c.type === "INVESTMENT").length,
    }),
    [allCategories],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = trimRequired(values.name);
    if (!name) return;

    setSaving(true);
    try {
      const payload = {
        name,
        type: values.type,
        color: values.color,
        icon: trimOptional(values.icon),
      };

      if (editing) {
        await api.categories.update(editing.id, payload);
        toast.success("Category updated");
      } else {
        await api.categories.create(payload);
        toast.success("Category created");
      }

      setDialogOpen(false);
      setEditing(null);
      await loadCategories();
    } catch (error) {
      toastApiError(
        editing ? "Failed to update category" : "Failed to create category",
        error,
      );
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    try {
      await api.categories.delete(deleteTarget.id);
      toast.success("Category deleted");
      setDeleteTarget(null);
      await loadCategories();
    } catch (error) {
      toastApiError("Failed to delete category", error);
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  const openSubCategoryDialog = (category: Category) => {
    setSubCategoryTarget(category);
    setSubCategoryName("");
    setEditingSubCategory(null);
    setDeleteSubCategoryTarget(null);
  };

  const handleSubCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subCategoryTarget || !subCategoryName.trim()) return;

    setSubCategorySaving(true);
    try {
      if (editingSubCategory) {
        await api.categories.updateSubCategory(
          subCategoryTarget.id,
          editingSubCategory.id,
          { name: subCategoryName.trim() },
        );
        toast.success("Sub-category updated");
      } else {
        await api.categories.createSubCategory(subCategoryTarget.id, {
          name: subCategoryName.trim(),
        });
        toast.success("Sub-category created");
      }

      setSubCategoryName("");
      setEditingSubCategory(null);
      const refreshed = await loadCategories();
      const updatedCategory = refreshed.find(
        (category) => category.id === subCategoryTarget.id,
      );
      if (updatedCategory) {
        setSubCategoryTarget(updatedCategory);
      }
    } catch (error) {
      toastApiError(
        editingSubCategory
          ? "Failed to update sub-category"
          : "Failed to create sub-category",
        error,
      );
      console.error(error);
    } finally {
      setSubCategorySaving(false);
    }
  };

  const handleDeleteSubCategory = async () => {
    if (!subCategoryTarget || !deleteSubCategoryTarget || deletingSubCategory) return;

    setDeletingSubCategory(true);
    try {
      await api.categories.deleteSubCategory(
        subCategoryTarget.id,
        deleteSubCategoryTarget.id,
      );
      toast.success("Sub-category deleted");
      setDeleteSubCategoryTarget(null);
      const refreshed = await loadCategories();
      const updatedCategory = refreshed.find(
        (category) => category.id === subCategoryTarget.id,
      );
      if (updatedCategory) {
        setSubCategoryTarget(updatedCategory);
      }
    } catch (error) {
      toastApiError("Failed to delete sub-category", error);
      console.error(error);
    } finally {
      setDeletingSubCategory(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize income, expenses, and investments for your transactions.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add category
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            { label: "Income categories", count: totals.income, type: "INCOME" },
            { label: "Expense categories", count: totals.expense, type: "EXPENSE" },
            {
              label: "Investment categories",
              count: totals.investment,
              type: "INVESTMENT",
            },
          ] as const
        ).map((item) => (
          <Card key={item.type} className="border-border/60 bg-card/50">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold">{item.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            if (!value) return;
            setTypeFilter(value as CategoryFormType | "ALL");
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by type">
              {(value) =>
                value === "ALL"
                  ? "All types"
                  : TRANSACTION_TYPE_LABELS[value as TransactionType]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {CATEGORY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {TRANSACTION_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageLoading message="Loading categories..." />
      ) : loadError ? (
        <PageError message={loadError} onRetry={() => void loadCategories()} />
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
          <Tags className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No categories found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add categories to classify your transactions.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sub-categories</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="w-[130px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={TRANSACTION_TYPE_BG[category.type]}
                    >
                      {TRANSACTION_TYPE_LABELS[category.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {category.subCategories?.length ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full ring-1 ring-border/60"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {category.color}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Manage sub-categories for ${category.name}`}
                        title="Manage sub-categories"
                        onClick={() => openSubCategoryDialog(category)}
                      >
                        <ListTree className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => setDeleteTarget(category)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
              {editing ? "Edit category" : "Add category"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Name</Label>
              <Input
                id="categoryName"
                placeholder="e.g. Groceries"
                value={values.name}
                onChange={(event) =>
                  setValues((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryType">Type</Label>
              <Select
                value={values.type}
                onValueChange={(value) => {
                  if (!value) return;
                  const type = value as CategoryFormType;
                  setValues((current) => ({
                    ...current,
                    type,
                    color: DEFAULT_CATEGORY_COLOR[type],
                  }));
                }}
              >
                <SelectTrigger id="categoryType" className="w-full">
                  <SelectValue placeholder="Select type">
                    {(value) =>
                      value
                        ? TRANSACTION_TYPE_LABELS[value as TransactionType]
                        : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TRANSACTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryColor">Color</Label>
              <Input
                id="categoryColor"
                type="color"
                value={values.color}
                onChange={(event) =>
                  setValues((current) => ({ ...current, color: event.target.value }))
                }
                className="h-10 w-full cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryIcon">Icon name (optional)</Label>
              <Input
                id="categoryIcon"
                placeholder="e.g. shopping-cart"
                value={values.icon}
                onChange={(event) =>
                  setValues((current) => ({ ...current, icon: event.target.value }))
                }
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
                {saving ? "Saving..." : editing ? "Save changes" : "Create category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!subCategoryTarget}
        onOpenChange={(open) => {
          if (!open) {
            setSubCategoryTarget(null);
            setSubCategoryName("");
            setEditingSubCategory(null);
            setDeleteSubCategoryTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Sub-categories for {subCategoryTarget?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubCategorySubmit} className="flex gap-2">
            <Input
              placeholder={
                editingSubCategory
                  ? "Edit sub-category name"
                  : "New sub-category name"
              }
              value={subCategoryName}
              onChange={(event) => setSubCategoryName(event.target.value)}
              required
            />
            <Button type="submit" disabled={subCategorySaving}>
              {subCategorySaving
                ? "Saving..."
                : editingSubCategory
                  ? "Save"
                  : "Add"}
            </Button>
            {editingSubCategory ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingSubCategory(null);
                  setSubCategoryName("");
                }}
              >
                Cancel
              </Button>
            ) : null}
          </form>

          <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-2">
            {(subCategoryTarget?.subCategories?.length ?? 0) === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No sub-categories yet. Add one above — for example, separate
                houses under Rental Income.
              </p>
            ) : (
              subCategoryTarget?.subCategories?.map((subCategory) => (
                <div
                  key={subCategory.id}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/40"
                >
                  <span className="text-sm font-medium">{subCategory.name}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingSubCategory(subCategory);
                        setSubCategoryName(subCategory.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteSubCategoryTarget(subCategory)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteSubCategoryTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteSubCategoryTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete sub-category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteSubCategoryTarget?.name}
              </span>
              ? Existing transactions will keep their category but lose this
              sub-category.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteSubCategoryTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubCategory}
              disabled={deletingSubCategory}
            >
              {deletingSubCategory ? "Deleting..." : "Delete"}
            </Button>
          </div>
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
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? Categories linked to transactions cannot be deleted.
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
