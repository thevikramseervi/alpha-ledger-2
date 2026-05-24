import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { YearQueryDto } from './dto/year-query.dto';
import { AccountBalanceQueryDto } from './dto/account-balance-query.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accountsService.create(dto);
  }

  @Get()
  findAll() {
    return this.accountsService.findAll();
  }

  @Get('balance-summary')
  getBalanceSummary(@Query() query: AccountBalanceQueryDto) {
    return this.accountsService.getBalanceSummary(query.year, query.month);
  }

  @Get('balance-trend')
  getBalanceTrend(@Query() query: YearQueryDto) {
    return this.accountsService.getBalanceTrend(query.year);
  }

  @Get(':id/reconciliation')
  getReconciliation(@Param('id') id: string) {
    return this.accountsService.getReconciliation(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountsService.remove(id);
  }
}
