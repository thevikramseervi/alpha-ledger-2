import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionType } from '../generated/prisma/client';
import { getAccountBalanceAtMonthBoundaries } from '../common/account-balance-summary';
import { getCategoryAllocations } from '../common/category-allocations';
import {
  getCalendarMonth,
  getMonthDateRange,
  getOverallDateRange,
  getReportsMonthSequence,
  getReportsMonthSequenceFromDateRange,
  parseCalendarDate,
  ReportsRange,
} from '../common/date-utils';
import { PrismaService } from '../prisma/prisma.service';

const transactionInclude = {
  category: true,
  subCategory: true,
  tags: {
    include: {
      tag: true,
    },
  },
  splits: {
    include: {
      category: true,
      subCategory: true,
    },
  },
} as const;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(params: {
    year?: number;
    month?: number;
    range?: ReportsRange;
    fromDate?: string;
    toDate?: string;
  }) {
    const usingCustomRange = Boolean(params.fromDate && params.toDate);
    let months;
    let year: number;
    let month: number;
    let range: ReportsRange | 'custom';
    let fromDate: string | null = null;
    let toDate: string | null = null;

    if (usingCustomRange) {
      const from = parseCalendarDate(params.fromDate!);
      const to = parseCalendarDate(params.toDate!);
      if (from > to) {
        throw new BadRequestException('fromDate must be on or before toDate');
      }

      months = getReportsMonthSequenceFromDateRange(from, to);
      if (months.length === 0) {
        throw new BadRequestException('Custom date range must include at least one month');
      }
      if (months.length > 24) {
        throw new BadRequestException('Custom date range is limited to 24 months');
      }

      const endMonth = months[months.length - 1]!;
      year = endMonth.year;
      month = endMonth.month;
      range = 'custom';
      fromDate = params.fromDate!;
      toDate = params.toDate!;
    } else {
      if (
        params.year === undefined ||
        params.month === undefined ||
        params.range === undefined
      ) {
        throw new BadRequestException(
          'Provide year, month, and range, or both fromDate and toDate',
        );
      }

      year = params.year;
      month = params.month;
      range = params.range;
      months = getReportsMonthSequence(year, month, range);
    }

    const { start, end } = getOverallDateRange(months);

    const [accounts, transactions, budgets] = await Promise.all([
      this.prisma.account.findMany({
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.transaction.findMany({
        where: {
          date: { gte: start, lte: end },
        },
        include: transactionInclude,
      }),
      this.prisma.categoryBudget.findMany({
        where: {
          OR: months.map((entry) => ({
            year: entry.year,
            month: entry.month,
          })),
        },
        include: { category: true },
      }),
    ]);

    const cashFlow = months.map((entry) => ({
      year: entry.year,
      month: entry.month,
      income: 0,
      expenses: 0,
      investments: 0,
      netSavings: 0,
    }));

    const cashFlowIndex = new Map(
      months.map((entry, index) => [`${entry.year}-${entry.month}`, index]),
    );

    const categoryTotals = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        type: TransactionType;
        color: string;
        total: number;
        count: number;
      }
    >();

    const categoryMonthly = months.map((entry) => ({
      year: entry.year,
      month: entry.month,
      totals: new Map<string, number>(),
    }));

    const subCategoryTotals = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        subCategoryId: string | null;
        subCategoryName: string;
        total: number;
        count: number;
      }
    >();

    const tagTotals = new Map<
      string,
      {
        tagId: string;
        tagName: string;
        color: string;
        total: number;
        count: number;
      }
    >();

    for (const transaction of transactions) {
      const txYear = transaction.date.getUTCFullYear();
      const txMonth = getCalendarMonth(transaction.date);
      const index = cashFlowIndex.get(`${txYear}-${txMonth}`);

      if (index !== undefined) {
        const amount = Number(transaction.amount);
        const point = cashFlow[index]!;

        if (transaction.type === TransactionType.INCOME) {
          point.income += amount;
        } else if (transaction.type === TransactionType.EXPENSE) {
          point.expenses += amount;
        } else if (transaction.type === TransactionType.INVESTMENT) {
          point.investments += amount;
        }
      }

      if (transaction.type === TransactionType.TRANSFER) {
        continue;
      }

      const monthEntry = categoryMonthly.find(
        (entry) => entry.year === txYear && entry.month === txMonth,
      );

      for (const allocation of getCategoryAllocations(transaction)) {
        const categoryKey = allocation.categoryId;
        const existingCategory = categoryTotals.get(categoryKey);

        if (existingCategory) {
          existingCategory.total += allocation.amount;
          existingCategory.count += 1;
        } else {
          categoryTotals.set(categoryKey, {
            categoryId: allocation.categoryId,
            categoryName: allocation.category.name,
            type: transaction.type,
            color: allocation.category.color,
            total: allocation.amount,
            count: 1,
          });
        }

        if (monthEntry) {
          monthEntry.totals.set(
            categoryKey,
            (monthEntry.totals.get(categoryKey) ?? 0) + allocation.amount,
          );
        }

        const subKey = `${allocation.categoryId}:${allocation.subCategoryId ?? 'none'}`;
        const subName = allocation.subCategory?.name ?? 'Uncategorized';
        const existingSub = subCategoryTotals.get(subKey);

        if (existingSub) {
          existingSub.total += allocation.amount;
          existingSub.count += 1;
        } else {
          subCategoryTotals.set(subKey, {
            categoryId: allocation.categoryId,
            categoryName: allocation.category.name,
            subCategoryId: allocation.subCategoryId,
            subCategoryName: subName,
            total: allocation.amount,
            count: 1,
          });
        }
      }

      if (transaction.tags.length > 0) {
        const amount = Number(transaction.amount);
        const share = amount / transaction.tags.length;

        for (const link of transaction.tags) {
          const existingTag = tagTotals.get(link.tagId);
          if (existingTag) {
            existingTag.total += share;
            existingTag.count += 1;
          } else {
            tagTotals.set(link.tagId, {
              tagId: link.tagId,
              tagName: link.tag.name,
              color: link.tag.color,
              total: share,
              count: 1,
            });
          }
        }
      }
    }

    for (const point of cashFlow) {
      point.netSavings = point.income - point.expenses - point.investments;
    }

    const normalizedTransactions = transactions.map((transaction) => ({
      type: transaction.type,
      amount: Number(transaction.amount),
      date: transaction.date,
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId,
    }));

    const netWorth = months.map((entry) => {
      const items = accounts.map((account) =>
        getAccountBalanceAtMonthBoundaries(
          {
            id: account.id,
            balance: Number(account.balance),
            initialBalance: Number(account.initialBalance),
            trackingStartDate: account.trackingStartDate,
          },
          normalizedTransactions,
          entry.year,
          entry.month,
        ),
      );
      const activeItems = items.filter((item) => item.existedDuringPeriod);

      return {
        year: entry.year,
        month: entry.month,
        totalClosing: activeItems.reduce(
          (total, item) => total + item.closing,
          0,
        ),
        netChange: activeItems.reduce(
          (total, item) => total + item.netChange,
          0,
        ),
      };
    });

    const endMonth = months[months.length - 1]!;
    const activeEndAccounts = accounts
      .map((account) => ({
        account,
        summary: getAccountBalanceAtMonthBoundaries(
          {
            id: account.id,
            balance: Number(account.balance),
            initialBalance: Number(account.initialBalance),
            trackingStartDate: account.trackingStartDate,
          },
          normalizedTransactions,
          endMonth.year,
          endMonth.month,
        ),
      }))
      .filter(({ summary }) => summary.existedDuringPeriod);
    const totalClosing = activeEndAccounts.reduce(
      (total, item) => total + item.summary.closing,
      0,
    );

    const accountAllocation = activeEndAccounts
      .map(({ account, summary }) => ({
        accountId: account.id,
        accountName: account.name,
        color: account.color,
        type: account.type,
        closing: summary.closing,
        share: totalClosing > 0 ? (summary.closing / totalClosing) * 100 : 0,
      }))
      .sort((a, b) => b.closing - a.closing);

    const budgetsByMonth = new Map<string, typeof budgets>();
    for (const budget of budgets) {
      const key = `${budget.year}-${budget.month}`;
      const existing = budgetsByMonth.get(key) ?? [];
      existing.push(budget);
      budgetsByMonth.set(key, existing);
    }

    const budgetHistory = months.map((entry) => {
      const { start: monthStart, end: monthEnd } = getMonthDateRange(
        entry.year,
        entry.month,
      );
      const monthBudgets = budgetsByMonth.get(`${entry.year}-${entry.month}`) ?? [];
      const monthExpenses = transactions.filter(
        (transaction) =>
          transaction.type === TransactionType.EXPENSE &&
          transaction.date >= monthStart &&
          transaction.date <= monthEnd,
      );

      const spentByCategory = new Map<string, number>();
      for (const transaction of monthExpenses) {
        for (const allocation of getCategoryAllocations(transaction)) {
          spentByCategory.set(
            allocation.categoryId,
            (spentByCategory.get(allocation.categoryId) ?? 0) + allocation.amount,
          );
        }
      }

      let budgetTotal = 0;
      let spentTotal = 0;
      let categoriesOnTrack = 0;

      for (const budget of monthBudgets) {
        const budgetAmount = Number(budget.amount);
        const spent = spentByCategory.get(budget.categoryId) ?? 0;
        budgetTotal += budgetAmount;
        spentTotal += spent;
        if (spent <= budgetAmount) {
          categoriesOnTrack += 1;
        }
      }

      const categoriesWithBudget = monthBudgets.length;

      return {
        year: entry.year,
        month: entry.month,
        budgetTotal,
        spentTotal,
        categoriesWithBudget,
        categoriesOnTrack,
        hitRate:
          categoriesWithBudget > 0
            ? (categoriesOnTrack / categoriesWithBudget) * 100
            : null,
      };
    });

    return {
      year,
      month,
      range,
      periodMode: usingCustomRange ? 'custom' : 'preset',
      fromDate,
      toDate,
      months,
      cashFlow,
      netWorth,
      accountAllocation,
      categories: {
        totals: Array.from(categoryTotals.values()).sort(
          (a, b) => b.total - a.total,
        ),
        monthly: categoryMonthly.map((entry) => ({
          year: entry.year,
          month: entry.month,
          totals: Array.from(entry.totals.entries()).map(
            ([categoryId, total]) => ({
              categoryId,
              total,
            }),
          ),
        })),
        subCategories: Array.from(subCategoryTotals.values()).sort(
          (a, b) => b.total - a.total,
        ),
      },
      tags: Array.from(tagTotals.values()).sort((a, b) => b.total - a.total),
      budgets: budgetHistory,
    };
  }
}
