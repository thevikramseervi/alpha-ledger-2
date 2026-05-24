import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getTransactionEffectOnAccount } from '../common/account-balance-effect';
import { getAccountBalanceAtMonthBoundaries } from '../common/account-balance-summary';
import { parseCalendarDate, getCalendarDateKey } from '../common/date-utils';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

const reconciliationInclude = {
  account: true,
  toAccount: true,
  category: true,
  subCategory: true,
} as const;

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAccountDto) {
    const initialBalance = dto.initialBalance ?? 0;
    return this.prisma.account.create({
      data: {
        name: dto.name,
        type: dto.type,
        balance: initialBalance,
        initialBalance,
        trackingStartDate: parseCalendarDate(dto.trackingStartDate),
        color: dto.color ?? this.defaultColor(dto.type),
      },
    });
  }

  findAll() {
    return this.prisma.account.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async getBalanceTrend(year: number) {
    const accounts = await this.findAll();

    if (accounts.length === 0) {
      return { year, points: [] };
    }

    const normalizedTransactions = await this.loadNormalizedTransactions(
      accounts.map((account) => account.id),
    );

    const points = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const items = accounts.map((account) =>
        getAccountBalanceAtMonthBoundaries(
          {
            id: account.id,
            balance: Number(account.balance),
            initialBalance: Number(account.initialBalance),
            trackingStartDate: account.trackingStartDate,
          },
          normalizedTransactions,
          year,
          month,
        ),
      );
      const activeItems = items.filter((item) => item.existedDuringPeriod);

      return {
        month,
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

    return { year, points };
  }

  async getBalanceSummary(year: number, month: number) {
    const accounts = await this.findAll();

    if (accounts.length === 0) {
      return {
        year,
        month,
        accounts: [],
        totals: {
          openingAtMonthStart: 0,
          addedDuringPeriod: 0,
          addedAccountCount: 0,
          closing: 0,
          startingBalance: 0,
          transactionNet: 0,
          netChange: 0,
          moneyIn: 0,
          moneyOut: 0,
          incomeIn: 0,
          transferIn: 0,
          expenseOut: 0,
          investmentOut: 0,
          transferOut: 0,
        },
      };
    }

    const accountIds = accounts.map((account) => account.id);
    const normalizedTransactions =
      await this.loadNormalizedTransactions(accountIds);

    const items = accounts.map((account) => {
      const summary = getAccountBalanceAtMonthBoundaries(
        {
          id: account.id,
          balance: Number(account.balance),
          initialBalance: Number(account.initialBalance),
          trackingStartDate: account.trackingStartDate,
        },
        normalizedTransactions,
        year,
        month,
      );

      return {
        accountId: account.id,
        accountName: account.name,
        type: account.type,
        color: account.color,
        currentBalance: Number(account.balance),
        ...summary,
      };
    });

    const activeItems = items.filter((item) => item.existedDuringPeriod);
    const atMonthStart = activeItems.filter((item) => item.existedAtMonthStart);
    const addedMidMonth = activeItems.filter((item) => !item.existedAtMonthStart);

    const sum = <K extends keyof (typeof activeItems)[number]>(key: K) =>
      activeItems.reduce((total, item) => total + Number(item[key]), 0);

    return {
      year,
      month,
      accounts: items,
      totals: {
        openingAtMonthStart: atMonthStart.reduce(
          (total, item) => total + item.opening,
          0,
        ),
        addedDuringPeriod: addedMidMonth.reduce(
          (total, item) => total + item.opening,
          0,
        ),
        addedAccountCount: addedMidMonth.length,
        closing: sum('closing'),
        startingBalance: sum('startingBalance'),
        transactionNet: sum('transactionNet'),
        netChange: sum('netChange'),
        moneyIn: sum('moneyIn'),
        moneyOut: sum('moneyOut'),
        incomeIn: sum('incomeIn'),
        transferIn: sum('transferIn'),
        expenseOut: sum('expenseOut'),
        investmentOut: sum('investmentOut'),
        transferOut: sum('transferOut'),
      },
    };
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }

    return account;
  }

  async update(id: string, dto: UpdateAccountDto) {
    await this.findOne(id);

    const transactionCount = await this.prisma.transaction.count({
      where: {
        OR: [{ accountId: id }, { toAccountId: id }],
      },
    });
    const hasTransactions = transactionCount > 0;

    if (dto.trackingStartDate !== undefined) {
      const newStartKey = getCalendarDateKey(
        parseCalendarDate(dto.trackingStartDate),
      );

      if (hasTransactions) {
        const earliestDate = await this.getEarliestTransactionDate(id);
        if (
          earliestDate &&
          newStartKey > getCalendarDateKey(earliestDate)
        ) {
          throw new BadRequestException(
            'Balance-as-of date must be on or before the earliest transaction on this account',
          );
        }
      }
    }

    return this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.trackingStartDate !== undefined
          ? { trackingStartDate: parseCalendarDate(dto.trackingStartDate) }
          : {}),
        ...(dto.initialBalance !== undefined
          ? {
              initialBalance: dto.initialBalance,
              ...(hasTransactions ? {} : { balance: dto.initialBalance }),
            }
          : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const transactionCount = await this.prisma.transaction.count({
      where: {
        OR: [{ accountId: id }, { toAccountId: id }],
      },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        'Cannot delete an account that has transactions',
      );
    }

    const recurringCount = await this.prisma.recurringTransaction.count({
      where: {
        OR: [{ accountId: id }, { toAccountId: id }],
      },
    });

    if (recurringCount > 0) {
      throw new BadRequestException(
        'Cannot delete an account used by recurring items',
      );
    }

    await this.prisma.account.delete({ where: { id } });
    return { deleted: true };
  }

  async getReconciliation(id: string) {
    const account = await this.findOne(id);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [{ accountId: id }, { toAccountId: id }],
      },
      include: reconciliationInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    let pendingTotal = 0;

    const mappedTransactions = transactions.map((transaction) => {
      const effectOnAccount = getTransactionEffectOnAccount(
        transaction.type,
        Number(transaction.amount),
        id,
        transaction.accountId,
        transaction.toAccountId,
      );

      if (!transaction.cleared) {
        pendingTotal += effectOnAccount;
      }

      return {
        ...transaction,
        amount: transaction.amount.toString(),
        effectOnAccount,
      };
    });

    const ledgerBalance = Number(account.balance);
    const clearedCount = transactions.filter((transaction) => transaction.cleared).length;

    return {
      account: {
        ...account,
        balance: account.balance.toString(),
      },
      ledgerBalance,
      pendingTotal,
      clearedBalance: ledgerBalance - pendingTotal,
      clearedCount,
      pendingCount: transactions.length - clearedCount,
      transactions: mappedTransactions,
    };
  }

  private async loadNormalizedTransactions(accountIds: string[]) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { accountId: { in: accountIds } },
          { toAccountId: { in: accountIds } },
        ],
      },
      select: {
        type: true,
        amount: true,
        date: true,
        accountId: true,
        toAccountId: true,
      },
    });

    return transactions.map((transaction) => ({
      type: transaction.type,
      amount: Number(transaction.amount),
      date: transaction.date,
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId,
    }));
  }

  private async getEarliestTransactionDate(accountId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        OR: [{ accountId }, { toAccountId: accountId }],
      },
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    return transaction?.date ?? null;
  }

  private defaultColor(type: AccountType) {
    switch (type) {
      case AccountType.CASH:
        return '#10b981';
      case AccountType.BANK:
        return '#3b82f6';
      case AccountType.OTHER:
        return '#6366f1';
    }
  }
}
