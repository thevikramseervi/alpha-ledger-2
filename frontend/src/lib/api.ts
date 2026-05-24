import { ApiError } from '@/lib/api-error';

function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

  if (typeof window === 'undefined') {
    return configured;
  }

  const { hostname, protocol } = window.location;
  const isLocalMachine =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0';

  // 0.0.0.0 in the URL bar is not routable — API calls must use localhost on this machine.
  if (isLocalMachine) {
    return configured;
  }

  // When opened via LAN/hotspot IP (e.g. http://10.x.x.x:3000), call the API on the same host.
  return `${protocol}//${hostname}:3001/api`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    let message = `Request failed (${response.status})`;

    if (body) {
      try {
        const parsed = JSON.parse(body) as {
          message?: string | string[];
          error?: string;
        };

        if (Array.isArray(parsed.message)) {
          message = parsed.message.join(', ');
        } else if (typeof parsed.message === 'string' && parsed.message) {
          message = parsed.message;
        } else if (typeof parsed.error === 'string' && parsed.error) {
          message = parsed.error;
        }
      } catch {
        if (body.length <= 200) {
          message = body;
        }
      }
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  accounts: {
    list: () => request<import('@/types').Account[]>('/accounts'),
    create: (data: import('@/types').CreateAccountInput) =>
      request<import('@/types').Account>('/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: import('@/types').UpdateAccountInput) =>
      request<import('@/types').Account>(`/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/accounts/${id}`, {
        method: 'DELETE',
      }),
    reconciliation: (id: string) =>
      request<import('@/types').AccountReconciliation>(
        `/accounts/${id}/reconciliation`,
      ),
    balanceSummary: (year: number, month: number) =>
      request<import('@/types').AccountBalanceSummary>(
        `/accounts/balance-summary?year=${year}&month=${month}`,
      ),
    balanceTrend: (year: number) =>
      request<import('@/types').AccountBalanceTrend>(
        `/accounts/balance-trend?year=${year}`,
      ),
  },
  categories: {
    list: (type?: string) =>
      request<import('@/types').Category[]>(
        type ? `/categories?type=${type}` : '/categories',
      ),
    create: (data: import('@/types').CreateCategoryInput) =>
      request<import('@/types').Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: import('@/types').UpdateCategoryInput) =>
      request<import('@/types').Category>(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/categories/${id}`, {
        method: 'DELETE',
      }),
    createSubCategory: (
      categoryId: string,
      data: import('@/types').CreateSubCategoryInput,
    ) =>
      request<import('@/types').SubCategory>(
        `/categories/${categoryId}/sub-categories`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
    updateSubCategory: (
      categoryId: string,
      subCategoryId: string,
      data: import('@/types').UpdateSubCategoryInput,
    ) =>
      request<import('@/types').SubCategory>(
        `/categories/${categoryId}/sub-categories/${subCategoryId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        },
      ),
    deleteSubCategory: (categoryId: string, subCategoryId: string) =>
      request<{ deleted: boolean }>(
        `/categories/${categoryId}/sub-categories/${subCategoryId}`,
        {
          method: 'DELETE',
        },
      ),
  },
  transactions: {
    list: (params?: {
      year?: number;
      month?: number;
      type?: string;
      categoryId?: string;
      accountId?: string;
      search?: string;
      fromDate?: string;
      toDate?: string;
      tagId?: string;
    }) => {
      const search = new URLSearchParams();
      if (params?.year !== undefined) search.set('year', String(params.year));
      if (params?.month !== undefined) search.set('month', String(params.month));
      if (params?.type) search.set('type', params.type);
      if (params?.categoryId) search.set('categoryId', params.categoryId);
      if (params?.accountId) search.set('accountId', params.accountId);
      if (params?.search) search.set('search', params.search);
      if (params?.fromDate) search.set('fromDate', params.fromDate);
      if (params?.toDate) search.set('toDate', params.toDate);
      if (params?.tagId) search.set('tagId', params.tagId);
      const query = search.toString();
      return request<import('@/types').Transaction[]>(
        `/transactions${query ? `?${query}` : ''}`,
      );
    },
    create: (data: import('@/types').CreateTransactionInput) =>
      request<import('@/types').Transaction>('/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: import('@/types').UpdateTransactionInput) =>
      request<import('@/types').Transaction>(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/transactions/${id}`, {
        method: 'DELETE',
      }),
    monthlySummary: (year: number, month: number) =>
      request<import('@/types').MonthlySummary>(
        `/transactions/summary/monthly?year=${year}&month=${month}`,
      ),
    yearlyTrend: (year: number) =>
      request<import('@/types').YearlyTrendPoint[]>(
        `/transactions/summary/yearly?year=${year}`,
      ),
    rentalIncomeSummary: (year: number, month: number) =>
      request<import('@/types').RentalIncomeSummary>(
        `/transactions/summary/rental-income?year=${year}&month=${month}`,
      ),
    investmentSummary: (
      year: number,
      month: number,
      accountId?: string,
    ) => {
      const search = new URLSearchParams({
        year: String(year),
        month: String(month),
      });
      if (accountId) {
        search.set('accountId', accountId);
      }
      return request<import('@/types').InvestmentSummary>(
        `/transactions/summary/investments?${search.toString()}`,
      );
    },
  },
  recurringTransactions: {
    list: () =>
      request<import('@/types').RecurringTransaction[]>('/recurring-transactions'),
    create: (data: import('@/types').CreateRecurringTransactionInput) =>
      request<import('@/types').RecurringTransaction>('/recurring-transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: import('@/types').UpdateRecurringTransactionInput) =>
      request<import('@/types').RecurringTransaction>(
        `/recurring-transactions/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        },
      ),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/recurring-transactions/${id}`, {
        method: 'DELETE',
      }),
    post: (id: string, year: number, month: number) =>
      request<{
        transaction: import('@/types').Transaction;
        recurring: import('@/types').RecurringTransaction;
      }>(`/recurring-transactions/${id}/post`, {
        method: 'POST',
        body: JSON.stringify({ year, month }),
      }),
  },
  budgets: {
    overview: (year: number, month: number) =>
      request<import('@/types').BudgetOverview>(
        `/budgets/overview?year=${year}&month=${month}`,
      ),
    sync: (data: import('@/types').SyncBudgetsInput) =>
      request<import('@/types').BudgetOverview>('/budgets/sync', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  reports: {
    overview: (params: {
      year?: number;
      month?: number;
      range?: import('@/types').ReportsRange;
      fromDate?: string;
      toDate?: string;
    }) => {
      const search = new URLSearchParams();
      if (params.year !== undefined) search.set('year', String(params.year));
      if (params.month !== undefined) search.set('month', String(params.month));
      if (params.range && params.range !== 'custom') {
        search.set('range', params.range);
      }
      if (params.fromDate) search.set('fromDate', params.fromDate);
      if (params.toDate) search.set('toDate', params.toDate);
      return request<import('@/types').ReportsOverview>(
        `/reports/overview?${search.toString()}`,
      );
    },
  },
  tags: {
    list: () => request<import('@/types').Tag[]>('/tags'),
    create: (data: import('@/types').CreateTagInput) =>
      request<import('@/types').Tag>('/tags', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: import('@/types').UpdateTagInput) =>
      request<import('@/types').Tag>(`/tags/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/tags/${id}`, { method: 'DELETE' }),
  },
};
