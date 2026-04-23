import { useState } from 'react';
import type React from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize2 } from 'lucide-react';
import { Button } from '../ui/button';
import type { AmortizationRow } from '../../types/api';

const PAGE_SIZE = 24;

interface AmortizationTableProps {
  schedule: AmortizationRow[];
}

function formatEur(cents: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function downloadCsv(schedule: AmortizationRow[]): void {
  const header = 'Mes,Cuota,Intereses,Amortización,Capital Pendiente\n';
  const rows = schedule
    .map(
      (r) =>
        `${r.month},${(r.payment / 100).toFixed(2)},${(r.interest / 100).toFixed(2)},${(r.principal / 100).toFixed(2)},${(r.balance / 100).toFixed(2)}`,
    )
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'amortizacion.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function AmortizationTable({
  schedule,
}: AmortizationTableProps): React.ReactElement {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const totalPages = Math.ceil(schedule.length / PAGE_SIZE);
  const displayedSchedule = expanded ? schedule : schedule.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Tabla de amortización
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({schedule.length} cuotas)
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="gap-1 text-xs"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            {expanded ? 'Colapsar' : 'Ver completa'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => downloadCsv(schedule)}
            className="gap-1 text-xs"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Mes
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Cuota
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-red-500">
                Intereses
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-green-600">
                Amortizacion
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Cap. Pendiente
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedSchedule.map((row) => (
              <tr
                key={row.month}
                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-2 text-gray-600">{row.month}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatEur(row.payment)}
                </td>
                <td className="px-4 py-2 text-right text-red-600">
                  {formatEur(row.interest)}
                </td>
                <td className="px-4 py-2 text-right text-green-600">
                  {formatEur(row.principal)}
                </td>
                <td className="px-4 py-2 text-right text-gray-700">
                  {formatEur(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination — only when collapsed */}
      {!expanded && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
          <span className="text-xs text-gray-400">
            Pagina {page + 1} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
              aria-label="Pagina anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
              aria-label="Pagina siguiente"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
