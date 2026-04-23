import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, Save } from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import SimulatorLayout from '../../components/simulators/SimulatorLayout';
import ResultsCard from '../../components/simulators/ResultsCard';
import AmortizationTable from '../../components/simulators/AmortizationTable';
import SaveSimulationDialog from '../../components/simulators/SaveSimulationDialog';
import { useCalculateMortgage } from '../../hooks/useSimulators';
import { downloadSimulationPdf } from '../../api/simulators.api';
import type { MortgageResult, AmortizationRow } from '../../types/api';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    principal: z.coerce.number().positive('Debe ser un valor positivo'),
    annualRate: z.coerce.number().min(0.1, 'Min 0.1%').max(20, 'Max 20%'),
    years: z.coerce.number().int().min(5, 'Min 5 anos').max(40, 'Max 40 anos'),
    isMixed: z.boolean(),
    fixedYears: z.coerce.number().int().min(1).max(30).optional(),
    variableRate: z.coerce.number().min(0.1).max(20).optional(),
  })
  .refine(
    (d) => {
      if (!d.isMixed) return true;
      return d.fixedYears !== undefined && d.variableRate !== undefined;
    },
    { message: 'Completa los datos de la hipoteca mixta', path: ['fixedYears'] },
  );

type FormValues = z.infer<typeof schema>;

// ─── Chart helpers ────────────────────────────────────────────────────────────

interface ChartPoint {
  mes: number;
  capital: number;
  intereses: number;
  capitalPendiente: number;
}

function buildChartData(schedule: AmortizationRow[]): ChartPoint[] {
  const step = schedule.length > 120 ? 12 : 1;
  const points: ChartPoint[] = [];
  let cumCapital = 0;
  let cumIntereses = 0;

  for (let i = 0; i < schedule.length; i++) {
    const row = schedule[i];
    cumCapital += row.principal;
    cumIntereses += row.interest;
    if (i % step === 0 || i === schedule.length - 1) {
      points.push({
        mes: row.month,
        capital: Math.round(cumCapital / 100),
        intereses: Math.round(cumIntereses / 100),
        capitalPendiente: Math.round(row.balance / 100),
      });
    }
  }
  return points;
}

function formatEurAxis(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${value}€`;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyResults(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
      <p className="text-sm text-gray-400">
        Rellena el formulario y pulsa "Calcular" para ver los resultados.
      </p>
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

interface ResultsProps {
  result: MortgageResult;
  inputs: FormValues;
}

function Results({ result, inputs }: ResultsProps): React.ReactElement {
  const [saveOpen, setSaveOpen] = useState(false);
  const chartData = buildChartData(result.schedule);

  const metrics = [
    {
      label: 'Cuota mensual',
      value: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
        result.monthlyPayment / 100,
      ),
      color: 'text-primary-700',
    },
    {
      label: 'Total a pagar',
      value: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
        result.totalPayment / 100,
      ),
    },
    {
      label: 'Total intereses',
      value: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
        result.totalInterest / 100,
      ),
      color: 'text-red-600',
    },
    {
      label: 'TAE',
      value: `${result.effectiveRate.toFixed(2)}%`,
      description: 'Tasa Anual Equivalente',
    },
  ];

  if (result.fixedPhasePayment) {
    metrics.push({
      label: 'Cuota fase fija',
      value: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
        result.fixedPhasePayment / 100,
      ),
    });
  }
  if (result.variablePhasePayment) {
    metrics.push({
      label: 'Cuota fase variable',
      value: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
        result.variablePhasePayment / 100,
      ),
    });
  }

  async function handleDownloadPdf(): Promise<void> {
    try {
      const blob = await downloadSimulationPdf('preview');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hipoteca.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // PDF download requires a saved simulation ID
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ResultsCard metrics={metrics} />

      {/* Stacked area chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Capital amortizado vs Intereses acumulados
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradCapital" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradIntereses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              label={{ value: 'Mes', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#9ca3af' }}
            />
            <YAxis
              tickFormatter={formatEurAxis}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value),
                name,
              ]}
              labelFormatter={(label: number) => `Mes ${label}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Area
              type="monotone"
              dataKey="capital"
              name="Capital amortizado"
              stackId="1"
              stroke="#2563eb"
              fill="url(#gradCapital)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="intereses"
              name="Intereses acumulados"
              stackId="1"
              stroke="#dc2626"
              fill="url(#gradIntereses)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Line chart — pending balance */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Capital pendiente</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatEurAxis}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              formatter={(value: number) => [
                new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value),
                'Capital pendiente',
              ]}
              labelFormatter={(label: number) => `Mes ${label}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Line
              type="monotone"
              dataKey="capitalPendiente"
              name="Capital pendiente"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <AmortizationTable schedule={result.schedule} />

      {/* Action buttons */}
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
        type="mortgage"
        inputs={inputs}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MortgagePage(): React.ReactElement {
  const mutation = useCalculateMortgage();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      principal: 200000,
      annualRate: 3.5,
      years: 25,
      isMixed: false,
    },
  });

  const isMixed = form.watch('isMixed');
  const watchedValues = form.watch();

  // Auto-recalculate with debounce when there are already results
  useEffect(() => {
    if (!mutation.data) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      form.handleSubmit(onSubmit)().catch(() => {
        // validation errors are handled by react-hook-form field state
      });
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues)]);

  function onSubmit(values: FormValues): void {
    mutation.mutate({
      principal: values.principal,
      annualRate: values.annualRate,
      years: values.years,
      fixedYears: values.isMixed ? values.fixedYears : undefined,
      variableRate: values.isMixed ? values.variableRate : undefined,
    });
  }

  const formNode = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="principal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capital del prestamo (€)</FormLabel>
              <FormControl>
                <Input type="number" min="1" step="1000" placeholder="200000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="annualRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de interes anual (%)</FormLabel>
              <FormControl>
                <Input type="number" min="0.1" max="20" step="0.05" placeholder="3.50" {...field} />
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
              <FormLabel>Plazo (anos)</FormLabel>
              <FormControl>
                <Input type="number" min="5" max="40" step="1" placeholder="25" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Mixed mortgage toggle */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
          <input
            id="isMixed"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            {...form.register('isMixed')}
          />
          <label htmlFor="isMixed" className="cursor-pointer text-sm font-medium text-gray-700">
            Hipoteca mixta (tramo fijo + variable)
          </label>
        </div>

        {isMixed && (
          <>
            <FormField
              control={form.control}
              name="fixedYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anos en tramo fijo</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="30" step="1" placeholder="10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="variableRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo variable (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0.1" max="20" step="0.05" placeholder="2.50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
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

  const resultsNode =
    mutation.data ? (
      <Results result={mutation.data} inputs={form.getValues()} />
    ) : (
      <EmptyResults />
    );

  return (
    <SimulatorLayout
      title="Simulador de hipoteca"
      description="Calcula cuota, intereses y tabla de amortizacion de tu hipoteca."
      form={formNode}
      results={resultsNode}
      isLoading={mutation.isPending}
    />
  );
}
