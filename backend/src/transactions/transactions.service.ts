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
  getCalendarDateKey,
  getCalendarMonth,
  getMonthDateRange,
  parseCalendarDate,
} from '../common/date-utils';
import {
  getCategoryAllocations,
  getRentalIncomeAmount,
} from '../common/category-allocations';
import { TagsService } from '../tags/tags.service';
import { interactiveTransactionOptions } from '../common/interactive-transaction-options';

const transactionInclude = {
  account: true,
  toAccount: true,
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
    orderBy: { id: 'asc' as const },
  },
} satisfies Prisma.TransactionInclude;

type SplitInput = {
  categoryId: string;
  subCategoryId?: string | null;
  amount: number;
};

type BalanceEffect = {
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId?: string | null;
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tagsService: TagsService,
  ) {}

  async create(dto: CreateTransactionDto) {
    await this.validateForCreate(dto);

    return this.prisma.$transaction(
      async (tx) => this.createInTransaction(tx, dto),
      interactiveTransactionOptions,
    );
  }

  async validateForCreate(dto: CreateTransactionDto) {
    const useSplits = this.hasSplitPayload(dto.splits);
    this.validateTransactionPayload(
      dto.type,
      dto.accountId,
      dto.toAccountId,
      dto.categoryId,
      dto.splits,
      dto.amount,
    );

    await this.ensureAccountExists(dto.accountId);
    if (dto.type === TransactionType.TRANSFER) {
      await this.ensureAccountExists(dto.toAccountId!);
    } else if (useSplits) {
      await this.ensureSplitsValid(dto.type, dto.splits!, dto.amount);
    } else {
      await this.ensureCategoryExists(dto.categoryId!, dto.type);
      await this.ensureSubCategoryExists(dto.subCategoryId, dto.categoryId!);
    }

    await this.ensureTransactionOnOrAfterTrackingStart(
      dto.date,
      dto.accountId,
      dto.type === TransactionType.TRANSFER ? dto.toAccountId : null,
    );
  }

  async createInTransaction(
    tx: Prisma.TransactionClient,
    dto: CreateTransactionDto,
  ) {
    const useSplits = this.hasSplitPayload(dto.splits);

    await this.lockAccountsForEffect(tx, {
      type: dto.type,
      amount: dto.amount,
      accountId: dto.accountId,
      toAccountId: dto.toAccountId,
    });

    const transaction = await tx.transaction.create({
      data: {
        amount: dto.amount,
        type: dto.type,
        accountId: dto.accountId,
        toAccountId:
          dto.type === TransactionType.TRANSFER ? dto.toAccountId : null,
        categoryId:
          dto.type === TransactionType.TRANSFER || useSplits
            ? null
            : dto.categoryId,
        subCategoryId:
          dto.type === TransactionType.TRANSFER || useSplits
            ? null
            : dto.subCategoryId,
        description: dto.description,
        date: parseCalendarDate(dto.date),
        notes: dto.notes,
        ...(useSplits
          ? {
              splits: {
                create: dto.splits!.map((split) => ({
                  categoryId: split.categoryId,
                  subCategoryId: split.subCategoryId ?? null,
                  amount: split.amount,
                })),
              },
            }
          : {}),
      },
      include: transactionInclude,
    });

    await this.applyBalanceEffect(tx, {
      type: dto.type,
      amount: dto.amount,
      accountId: dto.accountId,
      toAccountId: dto.toAccountId,
    });

    if (dto.tagIds !== undefined) {
      await this.syncTransactionTags(tx, transaction.id, dto.tagIds);
    }

    return tx.transaction.findUniqueOrThrow({
      where: { id: transaction.id },
      include: transactionInclude,
    });
  }

  async validateForRecurring(params: {
    type: TransactionType;
    accountId: string;
    toAccountId?: string | null;
    categoryId?: string | null;
    subCategoryId?: string | null;
  }) {
    this.validateTransactionPayload(
      params.type,
      params.accountId,
      params.toAccountId,
      params.categoryId,
    );

    await this.ensureAccountExists(params.accountId);
    if (params.type === TransactionType.TRANSFER) {
      await this.ensureAccountExists(params.toAccountId!);
      return;
    }

    await this.ensureCategoryExists(params.categoryId!, params.type);
    await this.ensureSubCategoryExists(
      params.subCategoryId ?? undefined,
      params.categoryId!,
    );
  }

  async findAll(query: TransactionQueryDto) {
    if (query.fromDate && query.toDate) {
      const from = parseCalendarDate(query.fromDate);
      const to = parseCalendarDate(query.toDate);
      if (from > to) {
        throw new BadRequestException('fromDate must be on or before toDate');
      }
    }

    if (query.month !== undefined && query.year === undefined) {
      throw new BadRequestException('year is required when month is provided');
    }

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
    const nextSplits =
      dto.splits !== undefined
        ? dto.splits
        : dto.categoryId !== undefined && existing.splits.length >= 2
          ? []
          : existing.splits.map((split) => ({
              categoryId: split.categoryId,
              subCategoryId: split.subCategoryId ?? undefined,
              amount: Number(split.amount),
            }));
    const useSplits = this.hasSplitPayload(nextSplits);

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
    } else if (useSplits) {
      next.categoryId = null;
      next.subCategoryId = null;
    }

    this.validateTransactionPayload(
      next.type,
      next.accountId,
      next.toAccountId,
      next.categoryId,
      dto.splits !== undefined ? nextSplits : useSplits ? nextSplits : undefined,
      next.amount,
    );

    await this.ensureAccountExists(next.accountId);
    if (next.type === TransactionType.TRANSFER) {
      await this.ensureAccountExists(next.toAccountId!);
    } else if (useSplits) {
      await this.ensureSplitsValid(next.type, nextSplits, next.amount);
    } else {
      await this.ensureCategoryExists(next.categoryId!, next.type);
      await this.ensureSubCategoryExists(
        next.subCategoryId ?? undefined,
        next.categoryId!,
      );
    }

    const nextDate = dto.date ?? this.formatStoredDate(existing.date);
    await this.ensureTransactionOnOrAfterTrackingStart(
      nextDate,
      next.accountId,
      next.type === TransactionType.TRANSFER ? next.toAccountId : null,
    );

    const balanceChanged =
      next.type !== existing.type ||
      next.amount !== Number(existing.amount) ||
      next.accountId !== existing.accountId ||
      (next.toAccountId ?? null) !== (existing.toAccountId ?? null);

    const applyUpdate = async (tx: Prisma.TransactionClient) => {
      if (dto.splits !== undefined || (useSplits && existing.splits.length > 0)) {
        await tx.transactionSplit.deleteMany({ where: { transactionId: id } });
        if (useSplits) {
          await tx.transactionSplit.createMany({
            data: nextSplits.map((split) => ({
              transactionId: id,
              categoryId: split.categoryId,
              subCategoryId: split.subCategoryId ?? null,
              amount: split.amount,
            })),
          });
        }
      }

      return tx.transaction.update({
        where: { id },
        data: {
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.accountId !== undefined && { accountId: dto.accountId }),
          ...(next.type === TransactionType.TRANSFER
            ? { toAccountId: next.toAccountId, categoryId: null, subCategoryId: null }
            : useSplits
              ? { toAccountId: null, categoryId: null, subCategoryId: null }
              : {
                  toAccountId: null,
                  ...(dto.categoryId !== undefined && { categoryId: next.categoryId }),
                  ...(dto.subCategoryId !== undefined && {
                    subCategoryId: next.subCategoryId,
                  }),
                }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.date && { date: parseCalendarDate(dto.date) }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.cleared !== undefined && { cleared: dto.cleared }),
        },
        include: transactionInclude,
      });
    };

    if (!balanceChanged) {
      return this.prisma.$transaction(
        async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Transaction" WHERE id = ${id} FOR UPDATE`;
        const updated = await applyUpdate(tx);
        return this.finalizeUpdateWithTags(tx, id, dto.tagIds, updated);
      },
        interactiveTransactionOptions,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Transaction" WHERE id = ${id} FOR UPDATE`;
      await this.lockAccountsForEffects(tx, [
        {
          type: next.type,
          amount: next.amount,
          accountId: next.accountId,
          toAccountId: next.toAccountId,
        },
        {
          type: existing.type,
          amount: Number(existing.amount),
          accountId: existing.accountId,
          toAccountId: existing.toAccountId,
        },
      ]);
      await this.reverseBalanceEffect(tx, {
        type: existing.type,
        amount: Number(existing.amount),
        accountId: existing.accountId,
        toAccountId: existing.toAccountId,
      });

      const transaction = await applyUpdate(tx);

      await this.applyBalanceEffect(tx, {
        type: next.type,
        amount: next.amount,
        accountId: next.accountId,
        toAccountId: next.toAccountId,
      });

      return this.finalizeUpdateWithTags(tx, id, dto.tagIds, transaction);
    },
      interactiveTransactionOptions,
    );
  }

  async remove(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Transaction" WHERE id = ${id} FOR UPDATE`;

      const existing = await tx.transaction.findUnique({
        where: { id },
        include: transactionInclude,
      });

      if (!existing) {
        throw new NotFoundException(`Transaction ${id} not found`);
      }

      await this.lockAccountsForEffect(tx, {
        type: existing.type,
        amount: Number(existing.amount),
        accountId: existing.accountId,
        toAccountId: existing.toAccountId,
      });

      await this.reverseBalanceEffect(tx, {
        type: existing.type,
        amount: Number(existing.amount),
        accountId: existing.accountId,
        toAccountId: existing.toAccountId,
      });
      await tx.transaction.delete({ where: { id } });
    },
      interactiveTransactionOptions,
    );

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

      for (const allocation of getCategoryAllocations(tx)) {
        const key = allocation.categoryId;
        const existing = categoryMap.get(key);
        if (existing) {
          existing.total += allocation.amount;
          existing.count += 1;
        } else {
          categoryMap.set(key, {
            categoryId: allocation.categoryId,
            categoryName: allocation.category.name,
            type: tx.type,
            color: allocation.category.color,
            total: allocation.amount,
            count: 1,
          });
        }
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
          date: { gte: monthStart, lte: monthEnd },
          OR: [
            { categoryId: category.id },
            { splits: { some: { categoryId: category.id } } },
          ],
        },
        include: {
          category: true,
          subCategory: true,
          splits: { include: { category: true, subCategory: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.transaction.findMany({
        where: {
          type: TransactionType.INCOME,
          date: { gte: yearStart, lte: monthEnd },
          OR: [
            { categoryId: category.id },
            { splits: { some: { categoryId: category.id } } },
          ],
        },
        include: {
          category: true,
          subCategory: true,
          splits: { include: { category: true, subCategory: true } },
        },
      }),
    ]);

    const byHouse = this.aggregateRentalIncomeByHouse(
      monthTransactions,
      category.subCategories,
      category.id,
    );
    const yearToDateByHouse = this.aggregateRentalIncomeByHouse(
      yearToDateTransactions,
      category.subCategories,
      category.id,
    );

    return {
      configured: true,
      year,
      month,
      categoryId: category.id,
      categoryName: category.name,
      monthTotal: monthTransactions.reduce(
        (sum, tx) => sum + getRentalIncomeAmount(tx, category.id),
        0,
      ),
      monthTransactionCount: monthTransactions.filter(
        (tx) => getRentalIncomeAmount(tx, category.id) > 0,
      ).length,
      yearToDateTotal: yearToDateTransactions.reduce(
        (sum, tx) => sum + getRentalIncomeAmount(tx, category.id),
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
          splits: { include: { category: true, subCategory: true } },
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
          splits: { include: { category: true, subCategory: true } },
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
      splits?: Array<{
        categoryId: string;
        category: { id: string; name: string; color: string };
        subCategoryId: string | null;
        subCategory: { id: string; name: string } | null;
        amount: { toString(): string };
      }>;
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
      for (const allocation of getCategoryAllocations(tx)) {
        const amount = allocation.amount;
        const categoryKey = allocation.categoryId;
        let categoryEntry = categoryMap.get(categoryKey);

        if (!categoryEntry) {
          const subMap = new Map<string, SubEntry>();
          subMap.set(uncategorizedSubKey, {
            subCategoryId: null,
            subCategoryName: 'Uncategorized',
            total: 0,
            count: 0,
          });
          categoryEntry = {
            categoryId: allocation.category.id,
            categoryName: allocation.category.name,
            color: allocation.category.color,
            total: 0,
            count: 0,
            subMap,
          };
          categoryMap.set(allocation.categoryId, categoryEntry);
        }

        categoryEntry.total += amount;
        categoryEntry.count += 1;

        const subKey = allocation.subCategoryId ?? uncategorizedSubKey;
        const existingSub = categoryEntry.subMap.get(subKey);
        if (existingSub) {
          existingSub.total += amount;
          existingSub.count += 1;
          continue;
        }

        categoryEntry.subMap.set(subKey, {
          subCategoryId: allocation.subCategoryId,
          subCategoryName: allocation.subCategory?.name ?? 'Uncategorized',
          total: amount,
          count: 1,
        });
      }
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
      categoryId: string | null;
      category: { id: string; name: string; color: string } | null;
      subCategoryId: string | null;
      subCategory: { id: string; name: string } | null;
      splits?: Array<{
        categoryId: string;
        category: { id: string; name: string; color: string };
        subCategoryId: string | null;
        subCategory: { id: string; name: string } | null;
        amount: { toString(): string };
      }>;
    }>,
    subCategories: Array<{ id: string; name: string }>,
    rentalCategoryId: string,
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
      for (const allocation of getCategoryAllocations(tx)) {
        if (allocation.categoryId !== rentalCategoryId) {
          continue;
        }

        const amount = allocation.amount;
        const key = allocation.subCategoryId ?? uncategorizedKey;
        const existing = totals.get(key);

        if (existing) {
          existing.total += amount;
          existing.count += 1;
          continue;
        }

        totals.set(key, {
          subCategoryId: allocation.subCategoryId,
          subCategoryName: allocation.subCategory?.name ?? 'Uncategorized',
          total: amount,
          count: 1,
        });
      }
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
    splits?: SplitInput[],
    amount?: number,
  ) {
    if (type === TransactionType.TRANSFER) {
      if (splits?.length) {
        throw new BadRequestException('Split categories are not supported for transfers');
      }
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

    if (this.hasSplitPayload(splits)) {
      if (categoryId) {
        throw new BadRequestException(
          'Use either a single category or split lines, not both',
        );
      }
      this.validateSplitTotals(splits!, amount!);
      return;
    }

    if (!categoryId) {
      throw new BadRequestException('Category is required for this transaction type');
    }
  }

  private hasSplitPayload(splits?: SplitInput[]) {
    if (splits?.length === 1) {
      throw new BadRequestException(
        'Split transactions require at least two lines',
      );
    }

    return Boolean(splits && splits.length >= 2);
  }

  private validateSplitTotals(splits: SplitInput[], amount: number) {
    const toCents = (value: number) => Math.round(value * 100);
    const total = splits.reduce((sum, split) => sum + split.amount, 0);
    if (toCents(total) !== toCents(amount)) {
      throw new BadRequestException(
        'Split amounts must add up to the transaction total',
      );
    }
  }

  private async ensureSplitsValid(
    type: TransactionType,
    splits: SplitInput[],
    amount: number,
  ) {
    this.validateSplitTotals(splits, amount);

    for (const split of splits) {
      await this.ensureCategoryExists(split.categoryId, type);
      await this.ensureSubCategoryExists(
        split.subCategoryId ?? undefined,
        split.categoryId,
      );
    }
  }

  private async lockAccountsForEffect(
    tx: Prisma.TransactionClient,
    effect: BalanceEffect,
  ) {
    await this.lockAccountsForEffects(tx, [effect]);
  }

  private async lockAccountsForEffects(
    tx: Prisma.TransactionClient,
    effects: BalanceEffect[],
  ) {
    const accountIds = new Set<string>();

    for (const effect of effects) {
      accountIds.add(effect.accountId);
      if (effect.type === TransactionType.TRANSFER && effect.toAccountId) {
        accountIds.add(effect.toAccountId);
      }
    }

    for (const accountId of [...accountIds].sort()) {
      await tx.$queryRaw`SELECT id FROM "Account" WHERE id = ${accountId} FOR UPDATE`;
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

  private async syncTransactionTags(
    tx: Prisma.TransactionClient,
    transactionId: string,
    tagIds: string[],
  ) {
    const uniqueIds = await this.tagsService.ensureTagIdsExist(tagIds);
    await tx.transactionTag.deleteMany({ where: { transactionId } });

    if (uniqueIds.length > 0) {
      await tx.transactionTag.createMany({
        data: uniqueIds.map((tagId) => ({ transactionId, tagId })),
      });
    }
  }

  private async finalizeUpdateWithTags(
    tx: Prisma.TransactionClient,
    transactionId: string,
    tagIds: string[] | undefined,
    current: Prisma.TransactionGetPayload<{ include: typeof transactionInclude }>,
  ) {
    if (tagIds === undefined) {
      return current;
    }

    await this.syncTransactionTags(tx, transactionId, tagIds);
    return tx.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: transactionInclude,
    });
  }

  private buildWhereClause(
    query: TransactionQueryDto,
  ): Prisma.TransactionWhereInput {
    const and: Prisma.TransactionWhereInput[] = [];

    if (query.fromDate || query.toDate) {
      const date: Prisma.DateTimeFilter = {};
      if (query.fromDate) {
        date.gte = parseCalendarDate(query.fromDate);
      }
      if (query.toDate) {
        date.lte = parseCalendarDate(query.toDate);
      }
      and.push({ date });
    } else if (query.year && query.month) {
      const { start, end } = getMonthDateRange(query.year, query.month);
      and.push({ date: { gte: start, lte: end } });
    } else if (query.year) {
      and.push({
        date: {
          gte: new Date(Date.UTC(query.year, 0, 1)),
          lte: new Date(Date.UTC(query.year, 11, 31)),
        },
      });
    }

    if (query.type) {
      and.push({ type: query.type });
    }

    if (query.categoryId) {
      and.push({
        OR: [
          { categoryId: query.categoryId },
          { splits: { some: { categoryId: query.categoryId } } },
        ],
      });
    }

    if (query.accountId) {
      and.push({
        OR: [
          { accountId: query.accountId },
          { toAccountId: query.accountId },
        ],
      });
    }

    if (query.tagId) {
      and.push({
        tags: {
          some: { tagId: query.tagId },
        },
      });
    }

    const search = query.search?.trim();
    if (search) {
      and.push({
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    return and.length > 0 ? { AND: and } : {};
  }

  private async ensureAccountExists(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }
  }

  private formatStoredDate(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async ensureTransactionOnOrAfterTrackingStart(
    date: string,
    accountId: string,
    toAccountId?: string | null,
  ) {
    const transactionKey = getCalendarDateKey(parseCalendarDate(date));
    const accountIds = toAccountId ? [accountId, toAccountId] : [accountId];
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { name: true, trackingStartDate: true },
    });

    for (const account of accounts) {
      const trackingStartKey = getCalendarDateKey(account.trackingStartDate);
      if (transactionKey < trackingStartKey) {
        throw new BadRequestException(
          `Transaction date must be on or after the balance-as-of date for ${account.name}`,
        );
      }
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
