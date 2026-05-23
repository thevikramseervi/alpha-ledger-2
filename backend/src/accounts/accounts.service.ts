import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        name: dto.name,
        type: dto.type,
        balance: dto.initialBalance ?? 0,
        color: dto.color ?? this.defaultColor(dto.type),
      },
    });
  }

  findAll() {
    return this.prisma.account.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
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

    return this.prisma.account.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const transactionCount = await this.prisma.transaction.count({
      where: { accountId: id },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        'Cannot delete an account that has transactions',
      );
    }

    await this.prisma.account.delete({ where: { id } });
    return { deleted: true };
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
