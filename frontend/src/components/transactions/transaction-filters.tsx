"use client";

import { useSyncExternalStore } from "react";
import { Download, Search, X } from "lucide-react";
import { MonthPicker } from "@/components/shared/month-picker";
import { DateInput } from "@/components/shared/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRANSACTION_TYPE_LABELS } from "@/lib/format";
import { MAX_SEARCH_LENGTH } from "@/lib/validation";
import { Account, Category, Tag, TransactionType } from "@/types";

interface TransactionFiltersProps {
  year: number;
  month: number;
  onPeriodChange: (year: number, month: number) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  typeFilter: TransactionType | "ALL";
  onTypeFilterChange: (value: TransactionType | "ALL") => void;
  accountFilter: string;
  onAccountFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  accounts: Account[];
  categories: Category[];
  tags: Tag[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  usingCustomDateRange: boolean;
  onExport: () => void;
  exportDisabled: boolean;
}

export function TransactionFilters({
  year,
  month,
  onPeriodChange,
  searchInput,
  onSearchInputChange,
  typeFilter,
  onTypeFilterChange,
  accountFilter,
  onAccountFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  tagFilter,
  onTagFilterChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  accounts,
  categories,
  tags,
  hasActiveFilters,
  onClearFilters,
  usingCustomDateRange,
  onExport,
  exportDisabled,
}: TransactionFiltersProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isExportDisabled = !isMounted || exportDisabled;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card/30 p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder="Search description or notes..."
          className="pl-9"
          aria-label="Search transactions"
          maxLength={MAX_SEARCH_LENGTH}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <MonthPicker
          year={year}
          month={month}
          onChange={onPeriodChange}
        />

        <Select
          value={typeFilter}
          onValueChange={(value) => {
            if (!value) return;
            onTypeFilterChange(value as TransactionType | "ALL");
          }}
        >
          <SelectTrigger className="w-full lg:w-[160px]">
            <SelectValue placeholder="Type">
              {(value) =>
                value === "ALL"
                  ? "All types"
                  : value
                    ? TRANSACTION_TYPE_LABELS[value as TransactionType]
                    : null
              }
            </SelectValue>
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

        <Select
          value={accountFilter}
          onValueChange={(value) => {
            if (!value) return;
            onAccountFilterChange(value);
          }}
        >
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="Account">
              {(value) =>
                value === "ALL"
                  ? "All accounts"
                  : value
                    ? accounts.find((account) => account.id === value)?.name ?? null
                    : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All accounts</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter}
          onValueChange={(value) => {
            if (!value) return;
            onCategoryFilterChange(value);
          }}
        >
          <SelectTrigger className="w-full lg:w-[200px]">
            <SelectValue placeholder="Category">
              {(value) => {
                if (value === "ALL") return "All categories";
                const category = categories.find((item) => item.id === value);
                return category
                  ? `${category.name} · ${TRANSACTION_TYPE_LABELS[category.type]}`
                  : null;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name} · {TRANSACTION_TYPE_LABELS[category.type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={tagFilter}
          onValueChange={(value) => {
            if (!value) return;
            onTagFilterChange(value);
          }}
        >
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="Tag">
              {(value) =>
                value === "ALL"
                  ? "All tags"
                  : value
                    ? tags.find((tag) => tag.id === value)?.name ?? null
                    : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="w-full lg:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Clear filters
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExportDisabled}
          className="w-full lg:w-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DateInput
          id="filter-from-date"
          label="From date"
          value={fromDate}
          onChange={onFromDateChange}
          showHint={false}
        />
        <DateInput
          id="filter-to-date"
          label="To date"
          value={toDate}
          onChange={onToDateChange}
          showHint={false}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {usingCustomDateRange
          ? "Custom date range is active and overrides the month picker above."
          : "Optional: set from/to dates to search across a custom range instead of one month."}{" "}
        Export CSV downloads the filtered list shown below.
      </p>
    </div>
  );
}
