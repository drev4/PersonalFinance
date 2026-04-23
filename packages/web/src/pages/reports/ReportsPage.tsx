import { useState } from 'react';
import type React from 'react';
import { FileBarChart, FileDown, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { MonthCard } from '../../components/reports/MonthCard';
import { ExportCsvForm } from '../../components/reports/ExportCsvForm';
import { useDownloadReport } from '../../hooks/useReports';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function getCurrentYear(): number {
  return new Date().getFullYear();
}

// ─── Annual report section ─────────────────────────────────────────────────────

function AnnualReportSection(): React.ReactElement {
  const currentYear = getCurrentYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const downloadReport = useDownloadReport();

  function handleDownloadYearly(): void {
    downloadReport.mutate({ type: 'yearly', year: selectedYear });
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Informe anual</CardTitle>
        <CardDescription>
          Descarga el resumen completo de tus finanzas de un ano en formato PDF.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <label
              htmlFor="year-select"
              className="block text-sm font-medium text-gray-700"
            >
              Seleccionar ano
            </label>
            <Select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-40"
              aria-label="Seleccionar ano del informe"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>

          <Button
            onClick={handleDownloadYearly}
            disabled={downloadReport.isPending}
            className="gap-2 self-end"
          >
            {downloadReport.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Descargando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" aria-hidden="true" />
                Descargar informe anual PDF
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage(): React.ReactElement {
  const currentYear = getCurrentYear();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
          <FileBarChart className="h-5 w-5 text-primary-600" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y exportacion</h1>
          <p className="text-sm text-gray-500">
            Descarga informes y exporta tus datos financieros.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Monthly reports */}
        <section aria-labelledby="monthly-reports-heading">
          <h2
            id="monthly-reports-heading"
            className="mb-4 text-lg font-semibold text-gray-900"
          >
            Informes mensuales
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Descarga el informe PDF de cualquier mes del ano {currentYear}.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {MONTHS.map((month) => (
              <MonthCard key={month} month={month} year={currentYear} />
            ))}
          </div>
        </section>

        {/* Annual report */}
        <section aria-labelledby="annual-report-heading">
          <h2
            id="annual-report-heading"
            className="mb-4 text-lg font-semibold text-gray-900"
          >
            Informe anual
          </h2>
          <AnnualReportSection />
        </section>

        {/* CSV export */}
        <section aria-labelledby="export-csv-heading">
          <h2
            id="export-csv-heading"
            className="mb-4 text-lg font-semibold text-gray-900"
          >
            Exportar transacciones
          </h2>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Exportar a CSV</CardTitle>
              <CardDescription>
                Filtra y descarga tus transacciones en formato CSV.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportCsvForm />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
