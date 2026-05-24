"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Hash, Pencil, Plus, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { getApiErrorMessage, logApiError, toastApiError } from "@/lib/api-error";
import { DEFAULT_TAG_COLOR } from "@/lib/format";
import { MAX_NAME_LENGTH, trimRequired } from "@/lib/validation";
import { Tag } from "@/types";

interface TagFormValues {
  name: string;
  color: string;
}

const defaultFormValues = (): TagFormValues => ({
  name: "",
  color: DEFAULT_TAG_COLOR,
});

function tagToFormValues(tag: Tag): TagFormValues {
  return {
    name: tag.name,
    color: tag.color,
  };
}

export function TagsPageClient() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [values, setValues] = useState<TagFormValues>(defaultFormValues);
  const [saving, setSaving] = useState(false);
  const requestIdRef = useRef(0);

  const loadTags = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);

    try {
      const data = await api.tags.list();
      if (requestId !== requestIdRef.current) {
        return;
      }
      setTags(data);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load tags", error);
      logApiError("Tags load failed", error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  const openCreateDialog = () => {
    setEditing(null);
    setValues(defaultFormValues());
    setDialogOpen(true);
  };

  const openEditDialog = (tag: Tag) => {
    setEditing(tag);
    setValues(tagToFormValues(tag));
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = trimRequired(values.name);
    if (!name) return;

    setSaving(true);
    try {
      const payload = { name, color: values.color };

      if (editing) {
        await api.tags.update(editing.id, payload);
        toast.success("Tag updated");
      } else {
        await api.tags.create(payload);
        toast.success("Tag created");
      }

      setDialogOpen(false);
      setEditing(null);
      await loadTags();
    } catch (error) {
      toastApiError(editing ? "Failed to update tag" : "Failed to create tag", error);
      logApiError("Tag save failed", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    try {
      await api.tags.delete(deleteTarget.id);
      toast.success("Tag deleted");
      setDeleteTarget(null);
      await loadTags();
    } catch (error) {
      toastApiError("Failed to delete tag", error);
      logApiError("Tag delete failed", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
          <p className="text-sm text-muted-foreground">
            Label transactions for flexible grouping in reports and filters.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add tag
        </Button>
      </div>

      {loading ? (
        <PageLoading message="Loading tags..." />
      ) : loadError ? (
        <PageError message={loadError} onRetry={() => void loadTags()} />
      ) : tags.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
          <Hash className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No tags yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create tags to label trips, projects, or any cross-category theme.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="font-medium">{tag.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full ring-1 ring-border/60"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-xs text-muted-foreground">{tag.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${tag.name}`}
                        onClick={() => openEditDialog(tag)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${tag.name}`}
                        onClick={() => setDeleteTarget(tag)}
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
            <DialogTitle>{editing ? "Edit tag" : "Add tag"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tagName">Name</Label>
              <Input
                id="tagName"
                placeholder="e.g. Vacation 2026"
                value={values.name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) =>
                  setValues((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagColor">Color</Label>
              <Input
                id="tagColor"
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
                {saving ? "Saving..." : editing ? "Save changes" : "Create tag"}
              </Button>
            </div>
          </form>
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
            <DialogTitle>Delete tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>? It
              will be removed from all linked transactions.
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
