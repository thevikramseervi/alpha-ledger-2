import { fetchReportsExportPackage } from '@/lib/reports-export/fetch-export-package';
import { registerPdfFonts } from '@/lib/reports-pdf/pdf-fonts';
import { pdfFilename } from '@/lib/reports-pdf/pdf-format';
import {
  ReportsPdfDocument,
  ReportsPdfMode,
} from '@/lib/reports-pdf/reports-pdf-document';
import { ReportsExportPackage } from '@/types';

export type ReportsExportParams = {
  year?: number;
  month?: number;
  range?: import('@/types').ReportsRange;
  fromDate?: string;
  toDate?: string;
};

export { fetchReportsExportPackage };

export type ReportsPdfDownloadOptions = {
  mode?: ReportsPdfMode;
  onProgress?: (message: string) => void;
};

export async function downloadReportsPdf(
  data: ReportsExportPackage,
  options: ReportsPdfDownloadOptions = {},
) {
  const { mode = 'full', onProgress } = options;

  registerPdfFonts();
  onProgress?.(
    mode === 'summary'
      ? 'Rendering summary PDF…'
      : `Rendering PDF (${data.transactions.length} transactions)…`,
  );

  const { pdf } = await import('@react-pdf/renderer');
  const blob = await pdf(<ReportsPdfDocument data={data} mode={mode} />).toBlob();

  onProgress?.('Downloading…');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = pdfFilename(data, mode);
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadReportsPdfFromParams(
  params: ReportsExportParams,
  options: ReportsPdfDownloadOptions = {},
) {
  const { onProgress } = options;

  onProgress?.('Fetching report data…');
  const data = await fetchReportsExportPackage(params);

  if (options.mode !== 'summary' && data.transactions.length > 500) {
    onProgress?.(
      `Large report (${data.transactions.length} transactions) — this may take a moment…`,
    );
  }

  await downloadReportsPdf(data, options);
  return data;
}
