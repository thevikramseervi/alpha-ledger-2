const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
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
    }) => {
      const search = new URLSearchParams();
      if (params?.year !== undefined) search.set('year', String(params.year));
      if (params?.month !== undefined) search.set('month', String(params.month));
      if (params?.type) search.set('type', params.type);
      if (params?.categoryId) search.set('categoryId', params.categoryId);
      if (params?.accountId) search.set('accountId', params.accountId);
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
};
