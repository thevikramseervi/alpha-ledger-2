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
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionDto,
  InvestmentSummaryQueryDto,
  RentalIncomeSummaryQueryDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { MonthQueryDto, YearQueryDto } from './dto/month-query.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @Get()
  findAll(@Query() query: TransactionQueryDto) {
    return this.transactionsService.findAll(query);
  }

  @Get('summary/monthly')
  getMonthlySummary(@Query() query: MonthQueryDto) {
    return this.transactionsService.getMonthlySummary(
      query.year,
      query.month,
    );
  }

  @Get('summary/yearly')
  getYearlyTrend(@Query() query: YearQueryDto) {
    return this.transactionsService.getYearlyTrend(query.year);
  }

  @Get('summary/rental-income')
  getRentalIncomeSummary(@Query() query: RentalIncomeSummaryQueryDto) {
    return this.transactionsService.getRentalIncomeSummary(
      query.year,
      query.month ?? new Date().getMonth() + 1,
    );
  }

  @Get('summary/investments')
  getInvestmentSummary(@Query() query: InvestmentSummaryQueryDto) {
    return this.transactionsService.getInvestmentSummary(
      query.year,
      query.month ?? new Date().getMonth() + 1,
      query.accountId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
