import { useState, useEffect } from 'react';
import type React from 'react';
import { FileDown, Check, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useDownloadReport } from '../../hooks/useReports';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface MonthCardProps {
  month: number;
  year: number;
}

export function MonthCard({ month, year }: MonthCardProps): React.ReactElement {
  const [downloadDone, setDownloadDone] = useState(false);
  const downloadReport = useDownloadReport();

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const isFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1);

  useEffect(() => {
    if (downloadDone) {
      const timer = setTimeout(() => setDownloadDone(false), 3_000);
      return () => clearTimeout(timer);
    }
  }, [downloadDone]);

  function handleDownload(): void {
    downloadReport.mutate(
      { type: 'monthly', year, month },
      {
        onSuccess: () => setDownloadDone(true),
      },
    );
  }

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        isCurrentMonth && 'ring-2 ring-primary-500',
      )}
    >
      <CardContent className="flex flex-col items-center gap-3 p-4">
        {isCurrentMonth && (
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-700">
            Mes actual
          </span>
        )}
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">{MONTH_NAMES[month - 1]}</p>
          <p className="text-xs text-gray-500">{year}</p>
        </div>

        <Button
          size="sm"
          variant={isCurrentMonth ? 'default' : 'outline'}
          onClick={handleDownload}
          disabled={downloadReport.isPending || downloadDone || isFuture}
          className="w-full gap-1.5"
          aria-label={`Descargar informe de ${MONTH_NAMES[month - 1]} ${year}`}
        >
          {downloadReport.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Descargando...
            </>
          ) : downloadDone ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
              <span className="text-green-700">Descargado</span>
            </>
          ) : (
            <>
              <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
              {isFuture ? 'No disponible' : 'Descargar PDF'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
