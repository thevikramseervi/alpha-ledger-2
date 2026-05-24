"use client";

import { useCallback, useEffect, useState } from "react";
import { PageError, PageLoading } from "@/components/shared/async-state";
import { MonthPicker } from "@/components/shared/month-picker";
import { RecurringTemplatesPanel } from "@/components/recurring/recurring-templates-panel";
import { api } from "@/lib/api";
import { getApiErrorMessage, logApiError, toastApiError } from "@/lib/api-error";
import { getCurrentPeriod } from "@/lib/format";
import { Account, Category, RecurringTransaction } from "@/types";

export function RecurringPageClient() {
  const [{ year, month }, setPeriod] = useState(getCurrentPeriod);
  const [recurringItems, setRecurringItems] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [recurringData, categoryData, accountData] = await Promise.all([
        api.recurringTransactions.list(),
        api.categories.list(),
        api.accounts.list(),
      ]);
      setRecurringItems(recurringData);
      setCategories(categoryData);
      setAccounts(accountData);
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
      toastApiError("Failed to load recurring templates", error);
      logApiError("Recurring page load failed", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader year={year} month={month} onPeriodChange={setPeriod} />
        <PageLoading message="Loading recurring templates..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader year={year} month={month} onPeriodChange={setPeriod} />
        <PageError message={loadError} onRetry={() => void loadData()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader year={year} month={month} onPeriodChange={setPeriod} />
      <RecurringTemplatesPanel
        year={year}
        month={month}
        recurringItems={recurringItems}
        categories={categories}
        accounts={accounts}
        onChanged={loadData}
      />
    </div>
  );
}

function PageHeader({
  year,
  month,
  onPeriodChange,
}: {
  year: number;
  month: number;
  onPeriodChange: (period: { year: number; month: number }) => void;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recurring</h1>
        <p className="text-sm text-muted-foreground">
          Templates for salary, rent, SIP, and other monthly items. Posting creates
          real transactions in your ledger.
        </p>
      </div>
      <MonthPicker
        year={year}
        month={month}
        onChange={(y, m) => onPeriodChange({ year: y, month: m })}
      />
    </div>
  );
}
