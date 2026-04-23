import { useState } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, CheckCircle2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../ui/form';
import { Alert, AlertDescription } from '../ui/alert';
import { useConnectBinance } from '../../hooks/useIntegrations';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const binanceSchema = z.object({
  apiKey: z
    .string()
    .min(20, 'La API Key debe tener al menos 20 caracteres'),
  apiSecret: z
    .string()
    .min(20, 'El API Secret debe tener al menos 20 caracteres'),
});

type BinanceFormValues = z.infer<typeof binanceSchema>;

// ─── Step indicator ───────────────────────────────────────────────────────────

interface StepIndicatorProps {
  current: 1 | 2 | 3;
}

function StepIndicator({ current }: StepIndicatorProps): React.ReactElement {
  const steps = [
    { n: 1, label: 'Instrucciones' },
    { n: 2, label: 'Credenciales' },
    { n: 3, label: 'Listo' },
  ] as const;

  return (
    <div className="mb-6 flex items-center justify-center gap-0">
      {steps.map(({ n, label }, idx) => (
        <div key={n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                n < current
                  ? 'bg-primary-600 text-white'
                  : n === current
                    ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                    : 'bg-gray-100 text-gray-400',
              ].join(' ')}
              aria-current={n === current ? 'step' : undefined}
            >
              {n < current ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                n
              )}
            </div>
            <span
              className={[
                'mt-1 text-[10px] font-medium',
                n === current ? 'text-primary-700' : 'text-gray-400',
              ].join(' ')}
            >
              {label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={[
                'mb-4 h-px w-10 transition-colors',
                n < current ? 'bg-primary-400' : 'bg-gray-200',
              ].join(' ')}
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1 — Instructions ────────────────────────────────────────────────────

interface Step1Props {
  onNext: () => void;
  onCancel: () => void;
}

function Step1Instructions({ onNext, onCancel }: Step1Props): React.ReactElement {
  const steps = [
    {
      n: 1,
      text: (
        <>
          Ve a{' '}
          <a
            href="https://www.binance.com/es/my/settings/api-management"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary-600 hover:underline"
          >
            Binance — Gestión de API
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          .
        </>
      ),
    },
    { n: 2, text: 'Crea una nueva clave API con un nombre descriptivo.' },
    {
      n: 3,
      text: (
        <>
          Activa{' '}
          <strong className="font-semibold text-yellow-700 bg-yellow-50 px-1 rounded">
            SOLO
          </strong>{' '}
          &ldquo;Lectura de datos spot y margen&rdquo;.
        </>
      ),
    },
    {
      n: 4,
      text: (
        <>
          <span className="font-semibold text-red-600">Nunca actives</span>{' '}
          &ldquo;Permitir trading&rdquo; ni &ldquo;Permitir retiros&rdquo;.
        </>
      ),
    },
    { n: 5, text: 'Copia la API Key y el API Secret generados.' },
  ];

  return (
    <>
      <div className="space-y-3">
        {steps.map(({ n, text }) => (
          <div key={n} className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              {n}
            </div>
            <p className="text-sm leading-relaxed text-gray-700">{text}</p>
          </div>
        ))}
      </div>

      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onNext}>Siguiente</Button>
      </DialogFooter>
    </>
  );
}

// ─── Step 2 — Credentials form ────────────────────────────────────────────────

interface Step2Props {
  onBack: () => void;
  onSuccess: () => void;
}

function Step2Credentials({ onBack, onSuccess }: Step2Props): React.ReactElement {
  const [showSecret, setShowSecret] = useState(false);
  const connectMutation = useConnectBinance();

  const form = useForm<BinanceFormValues>({
    resolver: zodResolver(binanceSchema),
    defaultValues: { apiKey: '', apiSecret: '' },
  });

  async function handleSubmit(values: BinanceFormValues): Promise<void> {
    try {
      await connectMutation.mutateAsync({ apiKey: values.apiKey, apiSecret: values.apiSecret });
      form.reset();
      onSuccess();
    } catch {
      // El error se muestra desde connectMutation.error
    }
  }

  const apiError =
    connectMutation.error instanceof Error
      ? connectMutation.error.message
      : connectMutation.isError
        ? 'Error al conectar con Binance. Verifica las credenciales e inténtalo de nuevo.'
        : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
        <div className="space-y-4">
          {/* API Key */}
          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Key</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="Pega tu API Key aquí"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="font-mono text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* API Secret */}
          <FormField
            control={form.control}
            name="apiSecret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Secret</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showSecret ? 'text' : 'password'}
                      placeholder="Pega tu API Secret aquí"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                      aria-label={showSecret ? 'Ocultar secret' : 'Mostrar secret'}
                    >
                      {showSecret ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Security notice */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
            <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-blue-800">
              Tus credenciales se cifran con{' '}
              <strong className="font-semibold">AES-256-GCM</strong> antes de almacenarse.
              Nunca se comparten con terceros.
            </p>
          </div>

          {/* API error */}
          {apiError && (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={connectMutation.isPending}
          >
            Atrás
          </Button>
          <Button type="submit" disabled={connectMutation.isPending}>
            {connectMutation.isPending ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Conectando...
              </>
            ) : (
              'Conectar'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ─── Step 3 — Success ─────────────────────────────────────────────────────────

interface Step3Props {
  onClose: () => void;
}

function Step3Success({ onClose }: Step3Props): React.ReactElement {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-9 w-9 text-green-600" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        ¡Conectado! Sincronización en curso...
      </h3>
      <p className="mb-6 text-sm text-gray-500">
        Tu portfolio de Binance se sincronizará en unos segundos.
      </p>
      <Button onClick={onClose} className="w-full sm:w-auto">
        Cerrar
      </Button>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

interface BinanceConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BinanceConnectDialog({
  open,
  onOpenChange,
}: BinanceConnectDialogProps): React.ReactElement {
  const [step, setStep] = useState<Step>(1);

  function handleOpenChange(value: boolean): void {
    if (!value) {
      // Reset to step 1 on close (but only after animation completes)
      setTimeout(() => setStep(1), 200);
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Binance</DialogTitle>
          {step === 1 && (
            <DialogDescription>
              Sigue los pasos para generar una API Key con permisos de solo lectura.
            </DialogDescription>
          )}
          {step === 2 && (
            <DialogDescription>
              Introduce tus credenciales de la API de Binance.
            </DialogDescription>
          )}
        </DialogHeader>

        {step !== 3 && <StepIndicator current={step} />}

        {step === 1 && (
          <Step1Instructions
            onNext={() => setStep(2)}
            onCancel={() => handleOpenChange(false)}
          />
        )}
        {step === 2 && (
          <Step2Credentials
            onBack={() => setStep(1)}
            onSuccess={() => setStep(3)}
          />
        )}
        {step === 3 && <Step3Success onClose={() => handleOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
