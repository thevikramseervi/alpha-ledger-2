import { Controller, Get, Query } from '@nestjs/common';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  getOverview(@Query() query: ReportsQueryDto) {
    return this.reportsService.getOverview(query);
  }
}
