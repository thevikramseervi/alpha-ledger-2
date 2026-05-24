import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RecurringTransactionsService } from './recurring-transactions.service';
import {
  CreateRecurringTransactionDto,
  PostRecurringTransactionDto,
  UpdateRecurringTransactionDto,
} from './dto/recurring-transaction.dto';

@Controller('recurring-transactions')
export class RecurringTransactionsController {
  constructor(
    private readonly recurringTransactionsService: RecurringTransactionsService,
  ) {}

  @Post()
  create(@Body() dto: CreateRecurringTransactionDto) {
    return this.recurringTransactionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.recurringTransactionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recurringTransactionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecurringTransactionDto) {
    return this.recurringTransactionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recurringTransactionsService.remove(id);
  }

  @Post(':id/post')
  post(@Param('id') id: string, @Body() dto: PostRecurringTransactionDto) {
    return this.recurringTransactionsService.post(id, dto);
  }
}
