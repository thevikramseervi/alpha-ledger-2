import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getCategoryAllocations } from '../common/category-allocations';
import { getMonthDateRange } from '../common/date-utils';
import { SyncBudgetsDto } from './dto/budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(year: number, month: number) {
    const { start, end } = getMonthDateRange(year, month);

    const [budgets, expenseCategories, transactions] = await Promise.all([
      this.prisma.categoryBudget.findMany({
        where: { year, month },
        include: { category: true },
      }),
      this.prisma.category.findMany({
        where: { type: TransactionType.EXPENSE },
        orderBy: { name: 'asc' },
      }),
      this.prisma.transaction.findMany({
        where: {
          type: TransactionType.EXPENSE,
          date: { gte: start, lte: end },
        },
        include: {
          category: true,
          subCategory: true,
          splits: {
            include: {
              category: true,
              subCategory: true,
            },
          },
        },
      }),
    ]);

    const spentByCategory = new Map<string, number>();
    for (const transaction of transactions) {
      for (const allocation of getCategoryAllocations(transaction)) {
        spentByCategory.set(
          allocation.categoryId,
          (spentByCategory.get(allocation.categoryId) ?? 0) + allocation.amount,
        );
      }
    }

    const budgetByCategory = new Map(
      budgets.map((budget) => [budget.categoryId, Number(budget.amount)]),
    );

    const items = expenseCategories
      .filter((category) => budgetByCategory.has(category.id))
      .map((category) => {
        const budget = budgetByCategory.get(category.id)!;
        const spent = spentByCategory.get(category.id) ?? 0;

        return {
          categoryId: category.id,
          categoryName: category.name,
          color: category.color,
          budget,
          spent,
          remaining: budget - spent,
          percentUsed: budget > 0 ? (spent / budget) * 100 : 0,
        };
      })
      .sort((a, b) => b.percentUsed - a.percentUsed);

    return {
      year,
      month,
      items,
      expenseCategories: expenseCategories.map((category) => ({
        categoryId: category.id,
        categoryName: category.name,
        color: category.color,
        budget: budgetByCategory.get(category.id) ?? null,
        spent: spentByCategory.get(category.id) ?? 0,
      })),
    };
  }

  async sync(dto: SyncBudgetsDto) {
    for (const entry of dto.budgets) {
      const category = await this.prisma.category.findUnique({
        where: { id: entry.categoryId },
      });

      if (!category) {
        throw new NotFoundException(`Category ${entry.categoryId} not found`);
      }

      if (category.type !== TransactionType.EXPENSE) {
        throw new BadRequestException('Budgets are only supported for expense categories');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const entry of dto.budgets) {
        if (entry.amount <= 0) {
          await tx.categoryBudget.deleteMany({
            where: {
              categoryId: entry.categoryId,
              year: dto.year,
              month: dto.month,
            },
          });
          continue;
        }

        await tx.categoryBudget.upsert({
          where: {
            categoryId_year_month: {
              categoryId: entry.categoryId,
              year: dto.year,
              month: dto.month,
            },
          },
          create: {
            categoryId: entry.categoryId,
            year: dto.year,
            month: dto.month,
            amount: entry.amount,
          },
          update: {
            amount: entry.amount,
          },
        });
      }
    });

    return this.getOverview(dto.year, dto.month);
  }
}
