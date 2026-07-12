import { endOfMonth, format, startOfMonth } from 'date-fns';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { SixMonthBarChart } from '../../components/dashboard/SixMonthBarChart';
import { CategoryDonut } from '../../components/reports/CategoryDonut';
import { ExportCsvForm } from '../../components/reports/ExportCsvForm';
import { MonthCard } from '../../components/reports/MonthCard';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { Select } from '../../components/ui/select';
import { TopBar } from '../../components/ui/TopBar';
import { useDashboardCashflow, useDashboardSpendingByCategory } from '../../hooks/useDashboard';
import { useDownloadReport } from '../../hooks/useReports';
import { useAuthStore } from '../../stores/authStore';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function isoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// ─── Analytics section (gasto total + 6-month chart + category donut) ─────────

function AnalyticsSection(): React.ReactElement {
  const currency = useAuthStore((s) => s.user?.baseCurrency) ?? 'EUR';
  const today = new Date();
  const from = isoDate(startOfMonth(today));
  const to = isoDate(endOfMonth(today));

  const { data: cashflow = [] } = useDashboardCashflow(6);
  const { data: spending = [] } = useDashboardSpendingByCategory(from, to);

  const monthlyExpenses = spending.reduce((sum, item) => sum + item.total, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--hairline)',
          borderRadius: 24,
          padding: 28,
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>
          Gasto total · este mes
        </div>
        <Amount value={monthlyExpenses} size={40} />
        <div style={{ marginTop: 24 }}>
          <SixMonthBarChart cashflow={cashflow} />
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--hairline)',
          borderRadius: 24,
          padding: 28,
        }}
      >
        <SectionLabel>Gasto por categoría · este mes</SectionLabel>
        <CategoryDonut items={spending} total={monthlyExpenses} currency={currency} />
      </div>
    </div>
  );
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
            <label htmlFor="year-select" className="block text-sm font-medium text-gray-700">
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
    <div className="animate-fade-in">
      <TopBar title="Estadísticas" subtitle="Descarga informes y exporta tus datos financieros" />
      <div style={{ padding: '28px 40px 60px' }}>
        <div className="space-y-8">
          {/* Analytics */}
          <section aria-label="Análisis del mes">
            <AnalyticsSection />
          </section>

          {/* Monthly reports */}
          <section aria-labelledby="monthly-reports-heading">
            <SectionLabel>Informes mensuales</SectionLabel>
            <p
              id="monthly-reports-heading"
              className="mb-4 text-sm"
              style={{ color: 'var(--text-3)' }}
            >
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
            <SectionLabel>Informe anual</SectionLabel>
            <div id="annual-report-heading" className="sr-only">
              Informe anual
            </div>
            <AnnualReportSection />
          </section>

          {/* CSV export */}
          <section aria-labelledby="export-csv-heading">
            <SectionLabel>Exportar transacciones</SectionLabel>
            <div id="export-csv-heading" className="sr-only">
              Exportar transacciones
            </div>
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
    </div>
  );
}
