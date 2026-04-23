import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, Save, TrendingDown } from 'lucide-react';
import {
  BarChart,
  Bar,
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
import SaveSimulationDialog from '../../components/simulators/SaveSimulationDialog';
import { useCalculateEarlyRepayment } from '../../hooks/useSimulators';
import { downloadSimulationPdf } from '../../api/simulators.api';
import type { EarlyRepaymentResult } from '../../types/api';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  remainingPrincipal: z.coerce.number().positive('Debe ser un valor positivo'),
  currentRate: z.coerce.number().min(0.1, 'Min 0.1%').max(30, 'Max 30%'),
  remainingMonths: z.coerce.number().int().min(1, 'Min 1 mes').max(480),
  extraPayment: z.coerce.number().positive('Debe ser un valor positivo'),
  strategy: z.enum(['reduce_quota', 'reduce_term']),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEur(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
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
        Rellena el formulario y pulsa "Calcular" para ver el ahorro potencial.
      </p>
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

interface ResultsProps {
  result: EarlyRepaymentResult;
  inputs: FormValues;
}

function Results({ result, inputs }: ResultsProps): React.ReactElement {
  const [saveOpen, setSaveOpen] = useState(false);

  const original = result.originalSchedule;
  const newSched = result.newSchedule;
  const savings = result.savings;

  const chartData = [
    {
      name: 'Total intereses',
      Actual: Math.round(original.totalInterest / 100),
      Nuevo: Math.round(newSched.totalInterest / 100),
    },
    {
      name: 'Total pagado',
      Actual: Math.round(original.totalPayment / 100),
      Nuevo: Math.round(newSched.totalPayment / 100),
    },
  ];

  async function handleDownloadPdf(): Promise<void> {
    try {
      const blob = await downloadSimulationPdf('preview');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'amortizacion-anticipada.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // needs saved ID
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Savings highlight box */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-start gap-3">
          <TrendingDown className="mt-0.5 h-6 w-6 flex-shrink-0 text-green-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-green-800">Con este pago extra ahorras:</p>
            <div className="mt-2 flex flex-wrap gap-6">
              <div>
                <p className="text-3xl font-bold text-green-700">
                  {formatEur(savings.interest)}
                </p>
                <p className="text-xs text-green-600">en intereses</p>
              </div>
              {savings.months > 0 && (
                <div>
                  <p className="text-3xl font-bold text-green-700">
                    {savings.months} meses
                  </p>
                  <p className="text-xs text-green-600">menos de prestamo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Situacion actual
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Cuota mensual</p>
              <p className="text-lg font-bold text-gray-900">
                {formatEur(original.monthlyPayment)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Meses restantes</p>
              <p className="text-lg font-bold text-gray-900">{original.remainingMonths}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total intereses</p>
              <p className="text-lg font-bold text-red-600">{formatEur(original.totalInterest)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total a pagar</p>
              <p className="text-lg font-bold text-gray-900">{formatEur(original.totalPayment)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-600">
            {inputs.strategy === 'reduce_quota' ? 'Reduciendo cuota' : 'Reduciendo plazo'}
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-green-700">Cuota mensual</p>
              <p className="text-lg font-bold text-green-800">
                {formatEur(newSched.monthlyPayment)}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-700">Meses restantes</p>
              <p className="text-lg font-bold text-green-800">{newSched.remainingMonths}</p>
            </div>
            <div>
              <p className="text-xs text-green-700">Total intereses</p>
              <p className="text-lg font-bold text-green-700">
                {formatEur(newSched.totalInterest)}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-700">Total a pagar</p>
              <p className="text-lg font-bold text-green-800">
                {formatEur(newSched.totalPayment)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart comparison */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Comparativa visual
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
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
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="Actual" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Nuevo" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

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
        type="early-repayment"
        inputs={inputs}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EarlyRepaymentPage(): React.ReactElement {
  const mutation = useCalculateEarlyRepayment();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      remainingPrincipal: 150000,
      currentRate: 3.5,
      remainingMonths: 240,
      extraPayment: 10000,
      strategy: 'reduce_term',
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
          name="remainingPrincipal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capital pendiente (€)</FormLabel>
              <FormControl>
                <Input type="number" min="1" step="1000" placeholder="150000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de interes actual (%)</FormLabel>
              <FormControl>
                <Input type="number" min="0.1" max="30" step="0.05" placeholder="3.50" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="remainingMonths"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meses restantes</FormLabel>
              <FormControl>
                <Input type="number" min="1" max="480" step="1" placeholder="240" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="extraPayment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pago extra que quieres realizar (€)</FormLabel>
              <FormControl>
                <Input type="number" min="1" step="500" placeholder="10000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <fieldset className="space-y-2 rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-medium text-gray-700">
            Estrategia de amortizacion
          </legend>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="reduce_quota"
              className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
              {...form.register('strategy')}
            />
            <span className="text-sm text-gray-700">Reducir cuota mensual</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="reduce_term"
              className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
              {...form.register('strategy')}
            />
            <span className="text-sm text-gray-700">Reducir plazo</span>
          </label>
        </fieldset>

        {mutation.isError && (
          <p className="text-xs text-red-600">
            Error al calcular. Verifica los datos e intenta de nuevo.
          </p>
        )}

        <Button type="submit" disabled={mutation.isPending} className="mt-1">
          {mutation.isPending ? 'Calculando...' : 'Calcular ahorro'}
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
      title="Simulador de amortizacion anticipada"
      description="Calcula el ahorro en intereses y tiempo al realizar un pago extra en tu prestamo."
      form={formNode}
      results={resultsNode}
      isLoading={mutation.isPending}
    />
  );
}
