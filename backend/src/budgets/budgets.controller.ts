import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { BudgetQueryDto, SyncBudgetsDto } from './dto/budget.dto';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get('overview')
  getOverview(@Query() query: BudgetQueryDto) {
    return this.budgetsService.getOverview(query.year, query.month);
  }

  @Put('sync')
  sync(@Body() dto: SyncBudgetsDto) {
    return this.budgetsService.sync(dto);
  }
}
