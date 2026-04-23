import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Download, Save } from 'lucide-react';
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
import { Alert, AlertDescription } from '../../components/ui/alert';
import SimulatorLayout from '../../components/simulators/SimulatorLayout';
import ResultsCard from '../../components/simulators/ResultsCard';
import AmortizationTable from '../../components/simulators/AmortizationTable';
import SaveSimulationDialog from '../../components/simulators/SaveSimulationDialog';
import { useCalculateLoan } from '../../hooks/useSimulators';
import { downloadSimulationPdf } from '../../api/simulators.api';
import type { LoanResult } from '../../types/api';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  principal: z.coerce.number().positive('Debe ser un valor positivo'),
  annualRate: z.coerce.number().min(0.1, 'Min 0.1%').max(50, 'Max 50%'),
  months: z.coerce.number().int().min(6, 'Min 6 meses').max(120, 'Max 120 meses'),
  includeOpeningFee: z.boolean(),
  openingFee: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

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
  result: LoanResult;
  inputs: FormValues;
}

function Results({ result, inputs }: ResultsProps): React.ReactElement {
  const [saveOpen, setSaveOpen] = useState(false);
  const taeWarning = result.tae > result.tin * 1.1;

  const fmt = (cents: number): string =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  const metrics = [
    { label: 'Cuota mensual', value: fmt(result.monthlyPayment), color: 'text-primary-700' },
    { label: 'Total a pagar', value: fmt(result.totalPayment) },
    { label: 'Total intereses', value: fmt(result.totalInterest), color: 'text-red-600' },
    { label: 'TIN', value: `${result.tin.toFixed(2)}%`, description: 'Tipo de Interes Nominal' },
    { label: 'TAE', value: `${result.tae.toFixed(2)}%`, description: 'Tasa Anual Equivalente' },
  ];

  async function handleDownloadPdf(): Promise<void> {
    try {
      const blob = await downloadSimulationPdf('preview');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prestamo.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // PDF requires saved simulation
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ResultsCard metrics={metrics} />

      {taeWarning && (
        <Alert variant="destructive" className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <AlertDescription>
            La TAE incluye comisiones adicionales significativas. El coste real del prestamo
            es notablemente superior al TIN.
          </AlertDescription>
        </Alert>
      )}

      <AmortizationTable schedule={result.schedule} />

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
        type="loan"
        inputs={inputs}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoanPage(): React.ReactElement {
  const mutation = useCalculateLoan();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      principal: 10000,
      annualRate: 8,
      months: 36,
      includeOpeningFee: false,
      openingFee: 0,
    },
  });

  const includeOpeningFee = form.watch('includeOpeningFee');
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
      principal: values.principal,
      annualRate: values.annualRate,
      months: values.months,
      openingFee:
        values.includeOpeningFee && values.openingFee ? values.openingFee : undefined,
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
              <FormLabel>Importe del prestamo (€)</FormLabel>
              <FormControl>
                <Input type="number" min="1" step="100" placeholder="10000" {...field} />
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
              <FormLabel>TIN — Tipo de interes anual (%)</FormLabel>
              <FormControl>
                <Input type="number" min="0.1" max="50" step="0.1" placeholder="8.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="months"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plazo (meses)</FormLabel>
              <FormControl>
                <Input type="number" min="6" max="120" step="1" placeholder="36" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
          <input
            id="includeOpeningFee"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            {...form.register('includeOpeningFee')}
          />
          <label
            htmlFor="includeOpeningFee"
            className="cursor-pointer text-sm font-medium text-gray-700"
          >
            Incluir comision de apertura
          </label>
        </div>

        {includeOpeningFee && (
          <FormField
            control={form.control}
            name="openingFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comision de apertura (€)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="1" placeholder="150" {...field} />
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
      title="Simulador de prestamo personal"
      description="Calcula cuota, TIN, TAE y tabla de amortizacion de tu prestamo."
      form={formNode}
      results={resultsNode}
      isLoading={mutation.isPending}
    />
  );
}
