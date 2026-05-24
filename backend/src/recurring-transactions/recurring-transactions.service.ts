import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { getRecurringDateIso } from '../common/date-utils';
import {
  CreateRecurringTransactionDto,
  PostRecurringTransactionDto,
  UpdateRecurringTransactionDto,
} from './dto/recurring-transaction.dto';
import { CreateTransactionDto } from '../transactions/dto/transaction.dto';
import { interactiveTransactionOptions } from '../common/interactive-transaction-options';

const recurringInclude = {
  account: true,
  toAccount: true,
  category: true,
  subCategory: true,
} satisfies Prisma.RecurringTransactionInclude;

@Injectable()
export class RecurringTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(dto: CreateRecurringTransactionDto) {
    this.validatePayload(dto.type, dto.accountId, dto.toAccountId, dto.categoryId);

    await this.transactionsService.validateForRecurring({
      type: dto.type,
      accountId: dto.accountId,
      toAccountId: dto.toAccountId,
      categoryId: dto.categoryId,
      subCategoryId: dto.subCategoryId,
    });

    return this.prisma.recurringTransaction.create({
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
        notes: dto.notes,
        dayOfMonth: dto.dayOfMonth,
      },
      include: recurringInclude,
    });
  }

  async findAll() {
    return this.prisma.recurringTransaction.findMany({
      include: recurringInclude,
      orderBy: [{ active: 'desc' }, { dayOfMonth: 'asc' }, { description: 'asc' }],
    });
  }

  async findOne(id: string) {
    const recurring = await this.prisma.recurringTransaction.findUnique({
      where: { id },
      include: recurringInclude,
    });

    if (!recurring) {
      throw new NotFoundException(`Recurring transaction ${id} not found`);
    }

    return recurring;
  }

  async update(id: string, dto: UpdateRecurringTransactionDto) {
    const existing = await this.findOne(id);

    const next = {
      type: dto.type ?? existing.type,
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
    } else {
      next.toAccountId = null;
    }

    this.validatePayload(
      next.type,
      next.accountId,
      next.toAccountId,
      next.categoryId,
    );

    await this.transactionsService.validateForRecurring({
      type: next.type,
      accountId: next.accountId,
      toAccountId: next.toAccountId,
      categoryId: next.categoryId,
      subCategoryId: next.subCategoryId,
    });

    return this.prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.type !== undefined && { type: dto.type }),
        accountId: next.accountId,
        toAccountId: next.toAccountId,
        categoryId: next.categoryId,
        subCategoryId: next.subCategoryId,
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.dayOfMonth !== undefined && { dayOfMonth: dto.dayOfMonth }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: recurringInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.recurringTransaction.delete({ where: { id } });
    return { deleted: true };
  }

  async post(id: string, dto: PostRecurringTransactionDto) {
    const recurring = await this.findOne(id);

    if (!recurring.active) {
      throw new BadRequestException('This recurring item is paused');
    }

    const date = getRecurringDateIso(
      dto.year,
      dto.month,
      recurring.dayOfMonth,
    );

    const createDto: CreateTransactionDto = {
      amount: Number(recurring.amount),
      type: recurring.type,
      accountId: recurring.accountId,
      toAccountId: recurring.toAccountId ?? undefined,
      categoryId: recurring.categoryId ?? undefined,
      subCategoryId: recurring.subCategoryId ?? undefined,
      description: recurring.description,
      date,
      notes: recurring.notes ?? undefined,
    };

    await this.transactionsService.validateForCreate(createDto);

    return this.prisma.$transaction(
      async (tx) => {
      const claimed = await tx.recurringTransaction.updateMany({
        where: {
          id,
          active: true,
          NOT: {
            lastPostedYear: dto.year,
            lastPostedMonth: dto.month,
          },
        },
        data: {
          lastPostedYear: dto.year,
          lastPostedMonth: dto.month,
        },
      });

      if (claimed.count === 0) {
        throw new BadRequestException(
          'This recurring item has already been added for the selected month',
        );
      }

      const transaction = await this.transactionsService.createInTransaction(
        tx,
        createDto,
      );

      const updatedRecurring = await tx.recurringTransaction.findUniqueOrThrow({
        where: { id },
        include: recurringInclude,
      });

      return { transaction, recurring: updatedRecurring };
    },
      interactiveTransactionOptions,
    );
  }

  private validatePayload(
    type: TransactionType,
    accountId: string,
    toAccountId?: string | null,
    categoryId?: string | null,
  ) {
    if (type === TransactionType.TRANSFER) {
      if (!toAccountId) {
        throw new BadRequestException(
          'Transfer requires a destination account',
        );
      }
      if (accountId === toAccountId) {
        throw new BadRequestException(
          'Transfer source and destination must be different accounts',
        );
      }
      return;
    }

    if (!categoryId) {
      throw new BadRequestException(
        'Category is required for this transaction type',
      );
    }
  }
}
