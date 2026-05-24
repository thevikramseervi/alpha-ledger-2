import { ReportsExportPackage, ReportsRange } from '@/types';

export type ReportsExportParams = {
  year?: number;
  month?: number;
  range?: ReportsRange;
  fromDate?: string;
  toDate?: string;
};

export async function fetchReportsExportPackage(
  params: ReportsExportParams,
): Promise<ReportsExportPackage> {
  const { api } = await import('@/lib/api');
  return api.reports.exportPackage(params);
}
