import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronUp, Download, Save } from 'lucide-react';
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '../../components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import SimulatorLayout from '../../components/simulators/SimulatorLayout';
import ResultsCard from '../../components/simulators/ResultsCard';
import SaveSimulationDialog from '../../components/simulators/SaveSimulationDialog';
import { useCalculateInvestment } from '../../hooks/useSimulators';
import { downloadSimulationPdf } from '../../api/simulators.api';
import type { InvestmentResult, InvestmentScenario, YearlyProjection } from '../../types/api';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  initialAmount: z.coerce.number().min(0, 'Debe ser 0 o mayor'),
  monthlyContribution: z.coerce.number().min(0, 'Debe ser 0 o mayor'),
  annualReturn: z.coerce.number().min(0.1, 'Min 0.1%').max(20, 'Max 20%'),
  years: z.coerce.number().int().min(1, 'Min 1 ano').max(50, 'Max 50 anos'),
  inflationRate: z.coerce.number().min(0).max(20),
  showRealValue: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEur(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
}

function formatEurAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M€`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${value}€`;
}

interface ChartDataPoint {
  ano: number;
  aportado: number;
  rendimientos: number;
  valorReal?: number;
}

function buildChartData(projection: YearlyProjection[]): ChartDataPoint[] {
  return projection.map((p) => ({
    ano: p.year,
    aportado: Math.round(p.contributed / 100),
    rendimientos: Math.round(p.returns / 100),
    valorReal: p.realValue !== undefined ? Math.round(p.realValue / 100) : undefined,
  }));
}

// ─── Scenarios Table ──────────────────────────────────────────────────────────

interface ScenariosTableProps {
  scenarios: NonNullable<InvestmentResult['scenarios']>;
  annualReturn: number;
  showRealValue: boolean;
}

function ScenariosTable({
  scenarios,
  annualReturn,
  showRealValue,
}: ScenariosTableProps): React.ReactElement {
  const cols: { key: keyof typeof scenarios; label: string; rate: string; color: string }[] = [
    {
      key: 'conservative',
      label: 'Conservador',
      rate: `${(annualReturn - 2).toFixed(1)}%`,
      color: 'text-amber-600',
    },
    { key: 'base', label: 'Base', rate: `${annualReturn.toFixed(1)}%`, color: 'text-primary-700' },
    {
      key: 'optimistic',
      label: 'Optimista',
      rate: `${(annualReturn + 2).toFixed(1)}%`,
      color: 'text-green-600',
    },
  ];

  function getScenario(key: keyof typeof scenarios): InvestmentScenario {
    return scenarios[key];
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Escenario
            </th>
            {cols.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${c.color}`}
              >
                {c.label}
                <br />
                <span className="text-gray-400 normal-case">({c.rate})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-50">
            <td className="px-4 py-3 text-gray-600">Valor final nominal</td>
            {cols.map((c) => (
              <td key={c.key} className="px-4 py-3 text-right font-semibold text-gray-900">
                {formatEur(getScenario(c.key).finalValue)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-gray-50">
            <td className="px-4 py-3 text-gray-600">Total rendimientos</td>
            {cols.map((c) => (
              <td key={c.key} className="px-4 py-3 text-right text-green-600">
                {formatEur(getScenario(c.key).totalReturns)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-gray-50">
            <td className="px-4 py-3 text-gray-600">Total aportado</td>
            {cols.map((c) => (
              <td key={c.key} className="px-4 py-3 text-right text-gray-700">
                {formatEur(getScenario(c.key).totalContributed)}
              </td>
            ))}
          </tr>
          {showRealValue && (
            <tr>
              <td className="px-4 py-3 text-gray-600">Valor real (inflacion)</td>
              {cols.map((c) => (
                <td key={c.key} className="px-4 py-3 text-right text-orange-600">
                  {getScenario(c.key).realFinalValue !== undefined
                    ? formatEur(getScenario(c.key).realFinalValue!)
                    : '—'}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Annual projection expandable table ──────────────────────────────────────

function AnnualProjectionTable({
  projection,
  showRealValue,
}: {
  projection: YearlyProjection[];
  showRealValue: boolean;
}): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? projection : projection.slice(0, 10);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Proyeccion anual</h3>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
        >
          {expanded ? (
            <>
              Colapsar <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          ) : (
            <>
              Ver todos ({projection.length} anos){' '}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Ano
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-blue-500">
                Aportado
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-green-600">
                Rendimientos
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total
              </th>
              {showRealValue && (
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-orange-500">
                  Valor real
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-600">{row.year}</td>
                <td className="px-4 py-2 text-right text-blue-600">
                  {formatEur(row.contributed)}
                </td>
                <td className="px-4 py-2 text-right text-green-600">
                  {formatEur(row.returns)}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">
                  {formatEur(row.total)}
                </td>
                {showRealValue && (
                  <td className="px-4 py-2 text-right text-orange-600">
                    {row.realValue !== undefined ? formatEur(row.realValue) : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyResults(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
      <p className="text-sm text-gray-400">
        Rellena el formulario y pulsa "Calcular" para ver la proyeccion.
      </p>
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

interface ResultsProps {
  result: InvestmentResult;
  inputs: FormValues;
}

function Results({ result, inputs }: ResultsProps): React.ReactElement {
  const [saveOpen, setSaveOpen] = useState(false);
  const showRealValue = inputs.showRealValue && result.realFinalValue !== undefined;
  const chartData = buildChartData(result.annualProjection);

  const metrics = [
    {
      label: 'Valor final nominal',
      value: formatEur(result.finalValue),
      color: 'text-primary-700',
    },
    {
      label: showRealValue ? 'Valor real (inflacion)' : 'Total rendimientos',
      value: showRealValue
        ? formatEur(result.realFinalValue!)
        : formatEur(result.totalReturns),
      color: showRealValue ? 'text-orange-600' : 'text-green-600',
    },
    { label: 'Total aportado', value: formatEur(result.totalContributed) },
    { label: 'Total rendimientos', value: formatEur(result.totalReturns), color: 'text-green-600' },
  ];

  async function handleDownloadPdf(): Promise<void> {
    try {
      const blob = await downloadSimulationPdf('preview');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inversion.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // needs saved ID
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ResultsCard metrics={metrics} />

      {/* Stacked area chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Evolucion del patrimonio
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradAportado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradRendimientos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="ano"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              label={{ value: 'Ano', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#9ca3af' }}
            />
            <YAxis
              tickFormatter={formatEurAxis}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatEur(value * 100),
                name,
              ]}
              labelFormatter={(label: number) => `Ano ${label}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Area
              type="monotone"
              dataKey="aportado"
              name="Aportado"
              stackId="1"
              stroke="#2563eb"
              fill="url(#gradAportado)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="rendimientos"
              name="Rendimientos"
              stackId="1"
              stroke="#16a34a"
              fill="url(#gradRendimientos)"
              strokeWidth={2}
            />
            {showRealValue && (
              <Line
                type="monotone"
                dataKey="valorReal"
                name="Valor real"
                stroke="#ea580c"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Scenarios */}
      {result.scenarios && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            Comparativa de escenarios
          </h3>
          <ScenariosTable
            scenarios={result.scenarios}
            annualReturn={inputs.annualReturn}
            showRealValue={showRealValue}
          />
        </div>
      )}

      <AnnualProjectionTable
        projection={result.annualProjection}
        showRealValue={showRealValue}
      />

      <div className="flex gap-3">
        <Button onClick={() => setSaveOpen(true)} variant="outline" className="gap-2">
          <Save className="h-4 w-4" aria-hidden="true" />
          Guardar simulacion
        </Button>
        <Button onClick={handleDownloadPdf} variant="outline" className="gap-2">
          <Download className="h-4 w-4" aria-hidden="true" />
          Descargar PDF
        </Button>
      </div>

      <SaveSimulationDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        type="investment"
        inputs={inputs}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvestmentPage(): React.ReactElement {
  const mutation = useCalculateInvestment();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      initialAmount: 10000,
      monthlyContribution: 200,
      annualReturn: 7,
      years: 20,
      inflationRate: 2,
      showRealValue: true,
    },
  });

  const watchedValues = form.watch();

  useEffect(() => {
    if (!mutation.data) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void form.handleSubmit(onSubmit)();
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues)]);

  function onSubmit(values: FormValues): void {
    mutation.mutate({
      initialAmount: values.initialAmount,
      monthlyContribution: values.monthlyContribution,
      annualReturn: values.annualReturn,
      years: values.years,
      inflationRate: values.showRealValue ? values.inflationRate : undefined,
    });
  }

  const formNode = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="initialAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capital inicial (€)</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="100" placeholder="10000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="monthlyContribution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aportacion mensual (€)</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="50" placeholder="200" {...field} />
              </FormControl>
              <FormDescription>Puede ser 0 si no tienes aportaciones periodicas.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="annualReturn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rentabilidad anual esperada (%)</FormLabel>
              <FormControl>
                <Input type="number" min="0.1" max="20" step="0.1" placeholder="7.0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="years"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horizonte temporal (anos)</FormLabel>
              <FormControl>
                <Input type="number" min="1" max="50" step="1" placeholder="20" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
          <input
            id="showRealValue"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            {...form.register('showRealValue')}
          />
          <label
            htmlFor="showRealValue"
            className="cursor-pointer text-sm font-medium text-gray-700"
          >
            Mostrar valor real ajustado por inflacion
          </label>
        </div>

        {watchedValues.showRealValue && (
          <FormField
            control={form.control}
            name="inflationRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inflacion anual estimada (%)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="20" step="0.1" placeholder="2.0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {mutation.isError && (
          <p className="text-xs text-red-600">
            Error al calcular. Verifica los datos e intenta de nuevo.
          </p>
        )}

        <Button type="submit" disabled={mutation.isPending} className="mt-1">
          {mutation.isPending ? 'Calculando...' : 'Calcular'}
        </Button>
      </form>
    </Form>
  );

  const resultsNode = mutation.data ? (
    <Results result={mutation.data} inputs={form.getValues()} />
  ) : (
    <EmptyResults />
  );

  return (
    <SimulatorLayout
      title="Simulador de inversion"
      description="Calcula el crecimiento de tus inversiones con interes compuesto y aportaciones periodicas."
      form={formNode}
      results={resultsNode}
      isLoading={mutation.isPending}
    />
  );
}
