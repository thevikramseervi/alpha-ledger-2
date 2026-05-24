import { fetchReportsExportPackage, ReportsExportParams } from '@/lib/reports-export/fetch-export-package';
import {
  buildReportsWorkbook,
  downloadReportsWorkbook,
  xlsxFilename,
} from '@/lib/reports-xlsx/build-reports-xlsx';
import { ReportsExportPackage } from '@/types';

export type ReportsXlsxDownloadOptions = {
  onProgress?: (message: string) => void;
};

export async function downloadReportsXlsx(
  data: ReportsExportPackage,
  options: ReportsXlsxDownloadOptions = {},
) {
  const { onProgress } = options;

  onProgress?.(`Building workbook (${data.transactions.length} transactions)…`);
  downloadReportsWorkbook(data);
  onProgress?.('Downloaded');
}

export async function downloadReportsXlsxFromParams(
  params: ReportsExportParams,
  options: ReportsXlsxDownloadOptions = {},
) {
  const { onProgress } = options;

  onProgress?.('Fetching report data…');
  const data = await fetchReportsExportPackage(params);

  if (data.transactions.length > 500) {
    onProgress?.(
      `Large report (${data.transactions.length} transactions) — building workbook…`,
    );
  }

  await downloadReportsXlsx(data, options);
  return data;
}

export { buildReportsWorkbook, xlsxFilename };
