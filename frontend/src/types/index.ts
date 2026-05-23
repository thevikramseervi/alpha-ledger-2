export type TransactionType = 'INCOME' | 'EXPENSE' | 'INVESTMENT' | 'TRANSFER';
export type AccountType = 'CASH' | 'BANK' | 'OTHER';

export interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string | null;
  subCategories?: SubCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  amount: string;
  type: TransactionType;
  accountId: string;
  account: Account;
  toAccountId: string | null;
  toAccount: Account | null;
  categoryId: string | null;
  category: Category | null;
  subCategoryId: string | null;
  subCategory: SubCategory | null;
  description: string;
  date: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlySummary {
  year: number;
  month: number;
  income: number;
  expenses: number;
  investments: number;
  transfers: number;
  netSavings: number;
  transactionCount: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    type: TransactionType;
    color: string;
    total: number;
    count: number;
  }>;
}

export interface YearlyTrendPoint {
  month: number;
  income: number;
  expenses: number;
  investments: number;
  netSavings: number;
}

export interface RentalIncomeHouseSummary {
  subCategoryId: string | null;
  subCategoryName: string;
  total: number;
  count: number;
}

export interface RentalIncomeSummary {
  configured: boolean;
  year: number;
  month: number;
  categoryId: string | null;
  categoryName: string;
  monthTotal: number;
  monthTransactionCount: number;
  yearToDateTotal: number;
  byHouse: RentalIncomeHouseSummary[];
  yearToDateByHouse: RentalIncomeHouseSummary[];
}

export interface InvestmentSubCategorySummary {
  subCategoryId: string | null;
  subCategoryName: string;
  total: number;
  count: number;
}

export interface InvestmentCategorySummary {
  categoryId: string | null;
  categoryName: string;
  color: string;
  total: number;
  count: number;
  subCategories: InvestmentSubCategorySummary[];
}

export interface InvestmentSummary {
  year: number;
  month: number;
  accountId: string | null;
  monthTotal: number;
  monthTransactionCount: number;
  yearToDateTotal: number;
  byCategory: InvestmentCategorySummary[];
  yearToDateByCategory: InvestmentCategorySummary[];
}

export interface CreateTransactionInput {
  amount: number;
  type: TransactionType;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  subCategoryId?: string;
  description: string;
  date: string;
  notes?: string;
}

export interface UpdateTransactionInput
  extends Partial<
    Omit<CreateTransactionInput, 'subCategoryId' | 'categoryId' | 'toAccountId'>
  > {
  categoryId?: string | null;
  subCategoryId?: string | null;
  toAccountId?: string | null;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  initialBalance?: number;
  color?: string;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  color?: string;
}

export interface CreateCategoryInput {
  name: string;
  type: Exclude<TransactionType, 'TRANSFER'>;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: Exclude<TransactionType, 'TRANSFER'>;
  color?: string;
  icon?: string;
}

export interface CreateSubCategoryInput {
  name: string;
}

export interface UpdateSubCategoryInput {
  name?: string;
}
