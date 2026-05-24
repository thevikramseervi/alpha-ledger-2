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
  initialBalance: string;
  trackingStartDate: string;
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
  splits?: TransactionSplit[];
  tags?: TransactionTagLink[];
  description: string;
  date: string;
  notes: string | null;
  cleared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSplit {
  id: string;
  categoryId: string;
  category: Category;
  subCategoryId: string | null;
  subCategory: SubCategory | null;
  amount: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionTagLink {
  transactionId: string;
  tagId: string;
  tag: Tag;
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

export type ReportsRange = '6m' | '12m' | 'ytd' | 'custom';

export interface ReportsTagTotal {
  tagId: string;
  tagName: string;
  color: string;
  total: number;
  count: number;
}

export interface ReportsMonthRef {
  year: number;
  month: number;
}

export interface ReportsCashFlowPoint {
  year: number;
  month: number;
  income: number;
  expenses: number;
  investments: number;
  netSavings: number;
}

export interface ReportsNetWorthPoint {
  year: number;
  month: number;
  totalClosing: number;
  netChange: number;
}

export interface ReportsAccountAllocation {
  accountId: string;
  accountName: string;
  color: string;
  type: AccountType;
  closing: number;
  share: number;
}

export interface ReportsCategoryTotal {
  categoryId: string;
  categoryName: string;
  type: TransactionType;
  color: string;
  total: number;
  count: number;
}

export interface ReportsCategoryMonth {
  year: number;
  month: number;
  totals: Array<{ categoryId: string; total: number }>;
}

export interface ReportsSubCategoryTotal {
  categoryId: string;
  categoryName: string;
  subCategoryId: string | null;
  subCategoryName: string;
  total: number;
  count: number;
}

export interface ReportsBudgetMonth {
  year: number;
  month: number;
  budgetTotal: number;
  spentTotal: number;
  categoriesWithBudget: number;
  categoriesOnTrack: number;
  hitRate: number | null;
}

export interface ReportsOverview {
  year: number;
  month: number;
  range: ReportsRange;
  periodMode: 'preset' | 'custom';
  fromDate: string | null;
  toDate: string | null;
  months: ReportsMonthRef[];
  cashFlow: ReportsCashFlowPoint[];
  netWorth: ReportsNetWorthPoint[];
  accountAllocation: ReportsAccountAllocation[];
  categories: {
    totals: ReportsCategoryTotal[];
    monthly: ReportsCategoryMonth[];
    subCategories: ReportsSubCategoryTotal[];
  };
  tags: ReportsTagTotal[];
  budgets: ReportsBudgetMonth[];
}

export interface CreateTransactionInput {
  amount: number;
  type: TransactionType;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  subCategoryId?: string;
  splits?: TransactionSplitInput[];
  description: string;
  date: string;
  notes?: string;
  tagIds?: string[];
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

export interface TransactionSplitInput {
  categoryId: string;
  subCategoryId?: string;
  amount: number;
}

export interface UpdateTransactionInput
  extends Partial<
    Omit<CreateTransactionInput, 'subCategoryId' | 'categoryId' | 'toAccountId'>
  > {
  categoryId?: string | null;
  subCategoryId?: string | null;
  toAccountId?: string | null;
  cleared?: boolean;
  splits?: TransactionSplitInput[];
  tagIds?: string[];
}

export interface ReconciliationTransaction extends Transaction {
  effectOnAccount: number;
}

export interface AccountReconciliation {
  account: Account;
  ledgerBalance: number;
  pendingTotal: number;
  clearedBalance: number;
  clearedCount: number;
  pendingCount: number;
  transactions: ReconciliationTransaction[];
}

export type AccountOpeningKind = 'CALENDAR' | 'TRACKING_START';

export interface AccountBalanceSummaryItem {
  accountId: string;
  accountName: string;
  type: AccountType;
  color: string;
  currentBalance: number;
  year: number;
  month: number;
  isCurrentMonth: boolean;
  existedAtMonthStart: boolean;
  existedDuringPeriod: boolean;
  openingKind: AccountOpeningKind;
  opening: number;
  closing: number;
  startingBalance: number;
  transactionNet: number;
  netChange: number;
  moneyIn: number;
  moneyOut: number;
  incomeIn: number;
  transferIn: number;
  expenseOut: number;
  investmentOut: number;
  transferOut: number;
}

export interface AccountBalanceTotals {
  openingAtMonthStart: number;
  addedDuringPeriod: number;
  addedAccountCount: number;
  closing: number;
  startingBalance: number;
  transactionNet: number;
  netChange: number;
  moneyIn: number;
  moneyOut: number;
  incomeIn: number;
  transferIn: number;
  expenseOut: number;
  investmentOut: number;
  transferOut: number;
}

export interface AccountBalanceSummary {
  year: number;
  month: number;
  accounts: AccountBalanceSummaryItem[];
  totals: AccountBalanceTotals;
}

export interface AccountBalanceTrendPoint {
  month: number;
  totalClosing: number;
  netChange: number;
}

export interface AccountBalanceTrend {
  year: number;
  points: AccountBalanceTrendPoint[];
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  trackingStartDate: string;
  initialBalance?: number;
  color?: string;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  trackingStartDate?: string;
  initialBalance?: number;
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

export interface RecurringTransaction {
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
  notes: string | null;
  dayOfMonth: number;
  active: boolean;
  lastPostedYear: number | null;
  lastPostedMonth: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringTransactionInput {
  amount: number;
  type: TransactionType;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  subCategoryId?: string;
  description: string;
  notes?: string;
  dayOfMonth: number;
}

export interface UpdateRecurringTransactionInput {
  amount?: number;
  type?: TransactionType;
  accountId?: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  subCategoryId?: string | null;
  description?: string;
  notes?: string;
  dayOfMonth?: number;
  active?: boolean;
}

export interface BudgetOverviewItem {
  categoryId: string;
  categoryName: string;
  color: string;
  budget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

export interface BudgetExpenseCategory {
  categoryId: string;
  categoryName: string;
  color: string;
  budget: number | null;
  spent: number;
}

export interface BudgetOverview {
  year: number;
  month: number;
  items: BudgetOverviewItem[];
  expenseCategories: BudgetExpenseCategory[];
}

export interface BudgetEntryInput {
  categoryId: string;
  amount: number;
}

export interface SyncBudgetsInput {
  year: number;
  month: number;
  budgets: BudgetEntryInput[];
}
