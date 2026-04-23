import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, PartyPopper, Save } from 'lucide-react';
import {
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
  FormDescription,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import SimulatorLayout from '../../components/simulators/SimulatorLayout';
import ResultsCard from '../../components/simulators/ResultsCard';
import SaveSimulationDialog from '../../components/simulators/SaveSimulationDialog';
import { useCalculateRetirement } from '../../hooks/useSimulators';
import { downloadSimulationPdf } from '../../api/simulators.api';
import type { RetirementResult, YearlyProjection } from '../../types/api';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    currentAge: z.coerce.number().int().min(18, 'Min 18 anos').max(64, 'Max 64 anos'),
    retirementAge: z.coerce.number().int().min(55, 'Min 55 anos').max(70, 'Max 70 anos'),
    targetMonthlyIncome: z.coerce.number().positive('Debe ser un valor positivo'),
    currentSavings: z.coerce.number().min(0, 'Debe ser 0 o mayor'),
    expectedReturn: z.coerce.number().min(0.1, 'Min 0.1%').max(20, 'Max 20%'),
    inflationRate: z.coerce.number().min(0).max(20),
    lifeExpectancy: z.coerce.number().int().min(65, 'Min 65').max(110, 'Max 110'),
  })
  .refine((d) => d.retirementAge > d.currentAge, {
    message: 'La edad de jubilacion debe ser mayor que la edad actual',
    path: ['retirementAge'],
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

interface ChartPoint {
  ano: number;
  capitalAcumulado: number;
  capitalNecesario: number;
}

function buildChartData(
  projection: YearlyProjection[],
  requiredNestEgg: number,
): ChartPoint[] {
  return projection.map((p) => ({
    ano: p.year,
    capitalAcumulado: Math.round(p.total / 100),
    capitalNecesario: Math.round(requiredNestEgg / 100),
  }));
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyResults(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
      <p className="text-sm text-gray-400">
        Rellena el formulario y pulsa "Calcular" para ver tu planificacion.
      </p>
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

interface ResultsProps {
  result: RetirementResult;
  inputs: FormValues;
}

function Results({ result, inputs }: ResultsProps): React.ReactElement {
  const [saveOpen, setSaveOpen] = useState(false);
  const isSufficient = result.monthlySavingsNeeded === 0;
  const chartData = buildChartData(result.annualProjection, result.requiredNestEgg);

  const metrics = [
    {
      label: 'Capital necesario',
      value: formatEur(result.requiredNestEgg),
      color: 'text-gray-900',
      description: 'Al momento de jubilarte',
    },
    {
      label: 'Capital proyectado',
      value: formatEur(result.projectedNestEgg),
      color: result.shortfall > 0 ? 'text-red-600' : 'text-green-600',
      description: 'Con tu ahorro actual + mensual',
    },
    {
      label: 'Anos hasta jubilacion',
      value: String(result.yearsToRetirement),
    },
    {
      label: 'Deficit',
      value: result.shortfall > 0 ? formatEur(result.shortfall) : '0 €',
      color: result.shortfall > 0 ? 'text-red-600' : 'text-green-600',
    },
  ];

  async function handleDownloadPdf(): Promise<void> {
    try {
      const blob = await downloadSimulationPdf('preview');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jubilacion.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // needs saved ID
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* KPI principal */}
      {isSufficient ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <PartyPopper className="mt-0.5 h-6 w-6 flex-shrink-0 text-green-600" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold text-green-800">
                Ya tienes suficiente para jubilarte
              </p>
              <p className="mt-1 text-sm text-green-700">
                Con tus ahorros actuales y la rentabilidad esperada, alcanzaras el capital
                necesario para cubrir tu renta mensual deseada.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
            Necesitas ahorrar mensualmente
          </p>
          <p className="mt-1 text-4xl font-bold text-primary-700">
            {formatEur(result.monthlySavingsNeeded)}
          </p>
          <p className="mt-1 text-sm text-primary-600">
            para alcanzar {formatEur(inputs.targetMonthlyIncome * 100)} /mes al jubilarte
          </p>
        </div>
      )}

      <ResultsCard metrics={metrics} />

      {/* Breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Desglose</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Con tus ahorros actuales ({formatEur(inputs.currentSavings * 100)}) y la
            rentabilidad del {inputs.expectedReturn}% llegaras a{' '}
            <span className="font-medium text-gray-900">
              {formatEur(result.projectedNestEgg)}
            </span>
            .
          </p>
          {result.shortfall > 0 ? (
            <p>
              Te faltan{' '}
              <span className="font-semibold text-red-600">{formatEur(result.shortfall)}</span>{' '}
              para alcanzar el capital objetivo de {formatEur(result.requiredNestEgg)}.
            </p>
          ) : (
            <p className="text-green-700">
              Superas el capital objetivo en{' '}
              <span className="font-semibold">
                {formatEur(Math.abs(result.shortfall))}
              </span>
              .
            </p>
          )}
        </div>
      </div>

      {/* Line chart */}
      {result.annualProjection.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            Proyeccion del capital acumulado
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
                width={64}
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
              <Line
                type="monotone"
                dataKey="capitalAcumulado"
                name="Capital acumulado"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="capitalNecesario"
                name="Capital necesario"
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

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
        type="retirement"
        inputs={inputs}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RetirementPage(): React.ReactElement {
  const mutation = useCalculateRetirement();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentAge: 35,
      retirementAge: 65,
      targetMonthlyIncome: 2000,
      currentSavings: 20000,
      expectedReturn: 6,
      inflationRate: 2,
      lifeExpectancy: 85,
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
    mutation.mutate(values);
  }

  const formNode = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="currentAge"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Edad actual</FormLabel>
              <FormControl>
                <Input type="number" min="18" max="64" step="1" placeholder="35" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="retirementAge"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Edad de jubilacion</FormLabel>
              <FormControl>
                <Input type="number" min="55" max="70" step="1" placeholder="65" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetMonthlyIncome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Renta mensual deseada (€)</FormLabel>
              <FormControl>
                <Input type="number" min="1" step="100" placeholder="2000" {...field} />
              </FormControl>
              <FormDescription>Ingresos mensuales netos al jubilarte.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentSavings"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ahorros actuales (€)</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="1000" placeholder="20000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expectedReturn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rentabilidad esperada (%)</FormLabel>
              <FormControl>
                <Input type="number" min="0.1" max="20" step="0.1" placeholder="6.0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="inflationRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inflacion esperada (%)</FormLabel>
              <FormControl>
                <Input type="number" min="0" max="20" step="0.1" placeholder="2.0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lifeExpectancy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Esperanza de vida</FormLabel>
              <FormControl>
                <Input type="number" min="65" max="110" step="1" placeholder="85" {...field} />
              </FormControl>
              <FormDescription>
                Anos que deseas que dure tu patrimonio tras jubilarte.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
      title="Simulador de jubilacion"
      description="Planifica cuanto necesitas ahorrar para alcanzar la renta mensual deseada al jubilarte."
      form={formNode}
      results={resultsNode}
      isLoading={mutation.isPending}
    />
  );
}
