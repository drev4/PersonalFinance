import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  downloadMonthlyReport,
  downloadYearlyReport,
  exportTransactionsCsv,
} from '../api/reports.api';

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1_000);
}

interface DownloadReportParams {
  type: 'monthly' | 'yearly';
  year: number;
  month?: number;
}

export function useDownloadReport(): UseMutationResult<void, Error, DownloadReportParams> {
  return useMutation({
    mutationFn: async ({ type, year, month }: DownloadReportParams) => {
      let blob: Blob;
      let filename: string;

      if (type === 'monthly') {
        if (month === undefined) throw new Error('El mes es requerido para el informe mensual');
        blob = await downloadMonthlyReport(year, month);
        const monthStr = String(month).padStart(2, '0');
        filename = `informe-mensual-${year}-${monthStr}.pdf`;
      } else {
        blob = await downloadYearlyReport(year);
        filename = `informe-anual-${year}.pdf`;
      }

      triggerBrowserDownload(blob, filename);
    },
  });
}

interface ExportCsvParams {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: string;
}

export function useExportCsv(): UseMutationResult<void, Error, ExportCsvParams> {
  return useMutation({
    mutationFn: async (filters: ExportCsvParams) => {
      const blob = await exportTransactionsCsv(filters);
      triggerBrowserDownload(blob, 'transacciones.csv');
    },
  });
}
