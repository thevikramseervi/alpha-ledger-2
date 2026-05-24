"use client";

import { Tag } from "@/types";
import { cn } from "@/lib/utils";

interface TransactionTagPickerProps {
  tags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function TransactionTagPicker({
  tags,
  selectedIds,
  onChange,
  disabled = false,
}: TransactionTagPickerProps) {
  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tags yet. Create tags on the Tags page to label transactions.
      </p>
    );
  }

  const toggleTag = (tagId: string) => {
    if (disabled) return;

    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId));
      return;
    }

    onChange([...selectedIds, tagId]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const selected = selectedIds.includes(tag.id);

        return (
          <button
            key={tag.id}
            type="button"
            disabled={disabled}
            onClick={() => toggleTag(tag.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selected
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
