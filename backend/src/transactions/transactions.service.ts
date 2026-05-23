import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import {
  getCalendarMonth,
  getMonthDateRange,
  parseCalendarDate,
} from '../common/date-utils';

const transactionInclude = {
  account: true,
  toAccount: true,
  category: true,
  subCategory: true,
} satisfies Prisma.TransactionInclude;

type BalanceEffect = {
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId?: string | null;
};

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransactionDto) {
    this.validateTransactionPayload(dto.type, dto.accountId, dto.toAccountId, dto.categoryId);

    await this.ensureAccountExists(dto.accountId);
    if (dto.type === TransactionType.TRANSFER) {
      await this.ensureAccountExists(dto.toAccountId!);
    } else {
      await this.ensureCategoryExists(dto.categoryId!, dto.type);
      await this.ensureSubCategoryExists(dto.subCategoryId, dto.categoryId!);
    }

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount: dto.amount,
          type: dto.type,
          accountId: dto.accountId,
          toAccountId:
            dto.type === TransactionType.TRANSFER ? dto.toAccountId : null,
          categoryId:
            dto.type === TransactionType.TRANSFER ? null : dto.categoryId,
          subCategoryId:
            dto.type === TransactionType.TRANSFER ? null : dto.subCategoryId,
          description: dto.description,
          date: parseCalendarDate(dto.date),
          notes: dto.notes,
        },
        include: transactionInclude,
      });

      await this.applyBalanceEffect(tx, {
        type: dto.type,
        amount: dto.amount,
        accountId: dto.accountId,
        toAccountId: dto.toAccountId,
      });

      return transaction;
    });
  }

  async findAll(query: TransactionQueryDto) {
    const where = this.buildWhereClause(query);

    return this.prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: transactionInclude,
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }

    return transaction;
  }

  async update(id: string, dto: UpdateTransactionDto) {
    const existing = await this.findOne(id);

    const next = {
      type: dto.type ?? existing.type,
      amount: dto.amount ?? Number(existing.amount),
      accountId: dto.accountId ?? existing.accountId,
      toAccountId:
        dto.toAccountId !== undefined ? dto.toAccountId : existing.toAccountId,
      categoryId:
        dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
      subCategoryId:
        dto.subCategoryId !== undefined
          ? dto.subCategoryId
          : existing.subCategoryId,
    };

    if (next.type === TransactionType.TRANSFER) {
      next.categoryId = null;
      next.subCategoryId = null;
    }

    this.validateTransactionPayload(
      next.type,
      next.accountId,
      next.toAccountId,
      next.categoryId,
    );

    await this.ensureAccountExists(next.accountId);
    if (next.type === TransactionType.TRANSFER) {
      await this.ensureAccountExists(next.toAccountId!);
    } else {
      await this.ensureCategoryExists(next.categoryId!, next.type);
      await this.ensureSubCategoryExists(
        next.subCategoryId ?? undefined,
        next.categoryId!,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.reverseBalanceEffect(tx, {
        type: existing.type,
        amount: Number(existing.amount),
        accountId: existing.accountId,
        toAccountId: existing.toAccountId,
      });

      const transaction = await tx.transaction.update({
        where: { id },
        data: {
          amount: dto.amount,
          type: dto.type,
          accountId: dto.accountId,
          toAccountId:
            next.type === TransactionType.TRANSFER ? next.toAccountId : null,
          categoryId: next.type === TransactionType.TRANSFER ? null : next.categoryId,
          subCategoryId:
            next.type === TransactionType.TRANSFER ? null : next.subCategoryId,
          description: dto.description,
          date: dto.date ? parseCalendarDate(dto.date) : undefined,
          notes: dto.notes,
        },
        include: transactionInclude,
      });

      await this.applyBalanceEffect(tx, {
        type: next.type,
        amount: next.amount,
        accountId: next.accountId,
        toAccountId: next.toAccountId,
      });

      return transaction;
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      await this.reverseBalanceEffect(tx, {
        type: existing.type,
        amount: Number(existing.amount),
        accountId: existing.accountId,
        toAccountId: existing.toAccountId,
      });
      await tx.transaction.delete({ where: { id } });
    });

    return { deleted: true };
  }

  async getMonthlySummary(year: number, month: number) {
    const { start: startDate, end: endDate } = getMonthDateRange(year, month);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: transactionInclude,
    });

    const summary = {
      year,
      month,
      income: 0,
      expenses: 0,
      investments: 0,
      transfers: 0,
      netSavings: 0,
      transactionCount: transactions.length,
      byCategory: [] as Array<{
        categoryId: string;
        categoryName: string;
        type: TransactionType;
        color: string;
        total: number;
        count: number;
      }>,
    };

    const categoryMap = new Map<
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

    for (const tx of transactions) {
      const amount = Number(tx.amount);

      if (tx.type === TransactionType.TRANSFER) {
        summary.transfers += amount;
        continue;
      }

      if (tx.type === TransactionType.INCOME) {
        summary.income += amount;
      } else if (tx.type === TransactionType.EXPENSE) {
        summary.expenses += amount;
      } else {
        summary.investments += amount;
      }

      if (!tx.category) {
        continue;
      }

      const key = tx.categoryId!;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total += amount;
        existing.count += 1;
      } else {
        categoryMap.set(key, {
          categoryId: tx.categoryId!,
          categoryName: tx.category.name,
          type: tx.type,
          color: tx.category.color,
          total: amount,
          count: 1,
        });
      }
    }

    summary.netSavings = summary.income - summary.expenses - summary.investments;
    summary.byCategory = Array.from(categoryMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    return summary;
  }

  async getYearlyTrend(year: number) {
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31));

    const transactions = await this.prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const months = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      income: 0,
      expenses: 0,
      investments: 0,
      netSavings: 0,
    }));

    for (const tx of transactions) {
      if (tx.type === TransactionType.TRANSFER) {
        continue;
      }

      const monthIndex = getCalendarMonth(new Date(tx.date)) - 1;
      const amount = Number(tx.amount);
      const entry = months[monthIndex];

      if (tx.type === TransactionType.INCOME) {
        entry.income += amount;
      } else if (tx.type === TransactionType.EXPENSE) {
        entry.expenses += amount;
      } else {
        entry.investments += amount;
      }
    }

    return months.map((entry) => ({
      ...entry,
      netSavings: entry.income - entry.expenses - entry.investments,
    }));
  }

  async getRentalIncomeSummary(year: number, month: number) {
    const category = await this.prisma.category.findFirst({
      where: {
        type: TransactionType.INCOME,
        name: { equals: 'Rental Income', mode: 'insensitive' },
      },
      include: {
        subCategories: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      return {
        configured: false,
        year,
        month,
        categoryId: null,
        categoryName: 'Rental Income',
        monthTotal: 0,
        monthTransactionCount: 0,
        yearToDateTotal: 0,
        byHouse: [] as Array<{
          subCategoryId: string | null;
          subCategoryName: string;
          total: number;
          count: number;
        }>,
        yearToDateByHouse: [] as Array<{
          subCategoryId: string | null;
          subCategoryName: string;
          total: number;
          count: number;
        }>,
      };
    }

    const { start: monthStart, end: monthEnd } = getMonthDateRange(year, month);
    const yearStart = new Date(Date.UTC(year, 0, 1));

    const [monthTransactions, yearToDateTransactions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          type: TransactionType.INCOME,
          categoryId: category.id,
          date: { gte: monthStart, lte: monthEnd },
        },
        include: { subCategory: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.transaction.findMany({
        where: {
          type: TransactionType.INCOME,
          categoryId: category.id,
          date: { gte: yearStart, lte: monthEnd },
        },
        include: { subCategory: true },
      }),
    ]);

    const byHouse = this.aggregateRentalIncomeByHouse(
      monthTransactions,
      category.subCategories,
    );
    const yearToDateByHouse = this.aggregateRentalIncomeByHouse(
      yearToDateTransactions,
      category.subCategories,
    );

    return {
      configured: true,
      year,
      month,
      categoryId: category.id,
      categoryName: category.name,
      monthTotal: monthTransactions.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0,
      ),
      monthTransactionCount: monthTransactions.length,
      yearToDateTotal: yearToDateTransactions.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0,
      ),
      byHouse,
      yearToDateByHouse,
    };
  }

  async getInvestmentSummary(
    year: number,
    month: number,
    accountId?: string,
  ) {
    if (accountId) {
      await this.ensureAccountExists(accountId);
    }

    const investmentCategories = await this.prisma.category.findMany({
      where: { type: TransactionType.INVESTMENT },
      include: {
        subCategories: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const { start: monthStart, end: monthEnd } = getMonthDateRange(year, month);
    const yearStart = new Date(Date.UTC(year, 0, 1));

    const baseWhere: Prisma.TransactionWhereInput = {
      type: TransactionType.INVESTMENT,
      ...(accountId ? { accountId } : {}),
    };

    const [monthTransactions, yearToDateTransactions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          ...baseWhere,
          date: { gte: monthStart, lte: monthEnd },
        },
        include: {
          category: true,
          subCategory: true,
          account: true,
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.transaction.findMany({
        where: {
          ...baseWhere,
          date: { gte: yearStart, lte: monthEnd },
        },
        include: {
          category: true,
          subCategory: true,
        },
      }),
    ]);

    return {
      year,
      month,
      accountId: accountId ?? null,
      monthTotal: monthTransactions.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0,
      ),
      monthTransactionCount: monthTransactions.length,
      yearToDateTotal: yearToDateTransactions.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0,
      ),
      byCategory: this.aggregateInvestmentsByCategory(
        monthTransactions,
        investmentCategories,
      ),
      yearToDateByCategory: this.aggregateInvestmentsByCategory(
        yearToDateTransactions,
        investmentCategories,
      ),
    };
  }

  private aggregateInvestmentsByCategory(
    transactions: Array<{
      amount: { toString(): string };
      categoryId: string | null;
      category: { id: string; name: string; color: string } | null;
      subCategoryId: string | null;
      subCategory: { id: string; name: string } | null;
    }>,
    investmentCategories: Array<{
      id: string;
      name: string;
      color: string;
      subCategories: Array<{ id: string; name: string }>;
    }>,
  ) {
    type SubEntry = {
      subCategoryId: string | null;
      subCategoryName: string;
      total: number;
      count: number;
    };

    type CategoryEntry = {
      categoryId: string | null;
      categoryName: string;
      color: string;
      total: number;
      count: number;
      subMap: Map<string, SubEntry>;
    };

    const uncategorizedSubKey = '__uncategorized__';
    const uncategorizedCategoryKey = '__uncategorized_category__';
    const categoryMap = new Map<string, CategoryEntry>();

    for (const category of investmentCategories) {
      const subMap = new Map<string, SubEntry>();
      for (const subCategory of category.subCategories) {
        subMap.set(subCategory.id, {
          subCategoryId: subCategory.id,
          subCategoryName: subCategory.name,
          total: 0,
          count: 0,
        });
      }
      subMap.set(uncategorizedSubKey, {
        subCategoryId: null,
        subCategoryName: 'Uncategorized',
        total: 0,
        count: 0,
      });
      categoryMap.set(category.id, {
        categoryId: category.id,
        categoryName: category.name,
        color: category.color,
        total: 0,
        count: 0,
        subMap,
      });
    }

    categoryMap.set(uncategorizedCategoryKey, {
      categoryId: null,
      categoryName: 'Uncategorized',
      color: '#6366f1',
      total: 0,
      count: 0,
      subMap: new Map([
        [
          uncategorizedSubKey,
          {
            subCategoryId: null,
            subCategoryName: 'Uncategorized',
            total: 0,
            count: 0,
          },
        ],
      ]),
    });

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const categoryKey = tx.categoryId ?? uncategorizedCategoryKey;
      let categoryEntry = categoryMap.get(categoryKey);

      if (!categoryEntry && tx.category) {
        const subMap = new Map<string, SubEntry>();
        subMap.set(uncategorizedSubKey, {
          subCategoryId: null,
          subCategoryName: 'Uncategorized',
          total: 0,
          count: 0,
        });
        categoryEntry = {
          categoryId: tx.category.id,
          categoryName: tx.category.name,
          color: tx.category.color,
          total: 0,
          count: 0,
          subMap,
        };
        categoryMap.set(tx.category.id, categoryEntry);
      }

      if (!categoryEntry) {
        categoryEntry = categoryMap.get(uncategorizedCategoryKey)!;
      }

      categoryEntry.total += amount;
      categoryEntry.count += 1;

      const subKey = tx.subCategoryId ?? uncategorizedSubKey;
      const existingSub = categoryEntry.subMap.get(subKey);
      if (existingSub) {
        existingSub.total += amount;
        existingSub.count += 1;
        continue;
      }

      categoryEntry.subMap.set(subKey, {
        subCategoryId: tx.subCategoryId,
        subCategoryName: tx.subCategory?.name ?? 'Uncategorized',
        total: amount,
        count: 1,
      });
    }

    return Array.from(categoryMap.values())
      .map((category) => ({
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        color: category.color,
        total: category.total,
        count: category.count,
        subCategories: Array.from(category.subMap.values())
          .filter(
            (subCategory) =>
              subCategory.subCategoryId !== null || subCategory.total > 0,
          )
          .sort((a, b) => b.total - a.total),
      }))
      .filter(
        (category) => category.categoryId !== null || category.total > 0,
      )
      .sort((a, b) => b.total - a.total);
  }

  private aggregateRentalIncomeByHouse(
    transactions: Array<{
      amount: { toString(): string };
      subCategoryId: string | null;
      subCategory: { id: string; name: string } | null;
    }>,
    subCategories: Array<{ id: string; name: string }>,
  ) {
    const totals = new Map<
      string,
      { subCategoryId: string | null; subCategoryName: string; total: number; count: number }
    >();

    for (const subCategory of subCategories) {
      totals.set(subCategory.id, {
        subCategoryId: subCategory.id,
        subCategoryName: subCategory.name,
        total: 0,
        count: 0,
      });
    }

    const uncategorizedKey = '__uncategorized__';
    totals.set(uncategorizedKey, {
      subCategoryId: null,
      subCategoryName: 'Uncategorized',
      total: 0,
      count: 0,
    });

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const key = tx.subCategoryId ?? uncategorizedKey;
      const existing = totals.get(key);

      if (existing) {
        existing.total += amount;
        existing.count += 1;
        continue;
      }

      totals.set(key, {
        subCategoryId: tx.subCategoryId,
        subCategoryName: tx.subCategory?.name ?? 'Uncategorized',
        total: amount,
        count: 1,
      });
    }

    return Array.from(totals.values())
      .filter((item) => item.subCategoryId !== null || item.total > 0)
      .sort((a, b) => b.total - a.total);
  }

  private validateTransactionPayload(
    type: TransactionType,
    accountId: string,
    toAccountId?: string | null,
    categoryId?: string | null,
  ) {
    if (type === TransactionType.TRANSFER) {
      if (!toAccountId) {
        throw new BadRequestException('Transfer requires a destination account');
      }
      if (accountId === toAccountId) {
        throw new BadRequestException(
          'Transfer source and destination must be different accounts',
        );
      }
      return;
    }

    if (!categoryId) {
      throw new BadRequestException('Category is required for this transaction type');
    }
  }

  private async applyBalanceEffect(
    tx: Prisma.TransactionClient,
    effect: BalanceEffect,
  ) {
    if (effect.type === TransactionType.TRANSFER) {
      await tx.account.update({
        where: { id: effect.accountId },
        data: { balance: { decrement: effect.amount } },
      });
      await tx.account.update({
        where: { id: effect.toAccountId! },
        data: { balance: { increment: effect.amount } },
      });
      return;
    }

    const delta = this.getBalanceDelta(effect.type, effect.amount);
    if (delta === 0) {
      return;
    }

    await tx.account.update({
      where: { id: effect.accountId },
      data: { balance: { increment: delta } },
    });
  }

  private async reverseBalanceEffect(
    tx: Prisma.TransactionClient,
    effect: BalanceEffect,
  ) {
    if (effect.type === TransactionType.TRANSFER) {
      await tx.account.update({
        where: { id: effect.accountId },
        data: { balance: { increment: effect.amount } },
      });
      await tx.account.update({
        where: { id: effect.toAccountId! },
        data: { balance: { decrement: effect.amount } },
      });
      return;
    }

    const delta = this.getBalanceDelta(effect.type, effect.amount);
    if (delta === 0) {
      return;
    }

    await tx.account.update({
      where: { id: effect.accountId },
      data: { balance: { increment: -delta } },
    });
  }

  private getBalanceDelta(type: TransactionType, amount: number) {
    return type === TransactionType.INCOME ? amount : -amount;
  }

  private buildWhereClause(
    query: TransactionQueryDto,
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {};

    if (query.year && query.month) {
      const { start, end } = getMonthDateRange(query.year, query.month);
      where.date = { gte: start, lte: end };
    } else if (query.year) {
      where.date = {
        gte: new Date(Date.UTC(query.year, 0, 1)),
        lte: new Date(Date.UTC(query.year, 11, 31)),
      };
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.accountId) {
      where.accountId = query.accountId;
    }

    return where;
  }

  private async ensureAccountExists(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }
  }

  private async ensureCategoryExists(
    categoryId: string,
    type: TransactionType,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }

    if (category.type !== type) {
      throw new NotFoundException(
        `Category type mismatch: expected ${type}, got ${category.type}`,
      );
    }
  }

  private async ensureSubCategoryExists(
    subCategoryId: string | undefined,
    categoryId: string,
  ) {
    if (!subCategoryId) {
      return;
    }

    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id: subCategoryId },
    });

    if (!subCategory) {
      throw new NotFoundException(`Sub-category ${subCategoryId} not found`);
    }

    if (subCategory.categoryId !== categoryId) {
      throw new NotFoundException(
        'Sub-category does not belong to the selected category',
      );
    }
  }
}
