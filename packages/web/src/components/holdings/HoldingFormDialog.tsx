import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bitcoin, BarChart2, TrendingUp, Landmark, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Combobox } from '../ui/combobox';
import { Skeleton } from '../ui/skeleton';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreateHolding, useUpdateHolding, useSearchTicker } from '../../hooks/useHoldings';
import type { HoldingWithValue, AssetType } from '../../types/api';
import { cn } from '../../lib/utils';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const holdingSchema = z.object({
  accountId: z.string().min(1, 'La cuenta es requerida'),
  quantity: z
    .string()
    .min(1, 'La cantidad es requerida')
    .refine((val) => {
      const n = parseFloat(val);
      return !isNaN(n) && n > 0;
    }, 'La cantidad debe ser un número positivo'),
  averageBuyPrice: z
    .number({ invalid_type_error: 'El precio debe ser un número' })
    .positive('El precio debe ser mayor que 0'),
});

type HoldingFormValues = z.infer<typeof holdingSchema>;

// ─── Asset type selector ──────────────────────────────────────────────────────

interface AssetTypeOption {
  type: AssetType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const ASSET_TYPE_OPTIONS: AssetTypeOption[] = [
  {
    type: 'crypto',
    label: 'Criptomoneda',
    description: 'Bitcoin, Ethereum, etc.',
    icon: <Bitcoin className="h-6 w-6" aria-hidden="true" />,
    color: 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-400',
  },
  {
    type: 'stock',
    label: 'Accion',
    description: 'Apple, Tesla, Inditex...',
    icon: <BarChart2 className="h-6 w-6" aria-hidden="true" />,
    color: 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400',
  },
  {
    type: 'etf',
    label: 'ETF',
    description: 'Vanguard, iShares...',
    icon: <TrendingUp className="h-6 w-6" aria-hidden="true" />,
    color: 'border-green-200 bg-green-50 text-green-700 hover:border-green-400',
  },
  {
    type: 'bond',
    label: 'Bono',
    description: 'Renta fija, deuda publica',
    icon: <Landmark className="h-6 w-6" aria-hidden="true" />,
    color: 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400',
  },
];

// ─── Ticker search step ───────────────────────────────────────────────────────

interface TickerStepProps {
  assetType: AssetType;
  selectedSymbol: string;
  selectedExchange: string | undefined;
  onSymbolSelect: (symbol: string, exchange?: string, name?: string) => void;
}

function TickerStep({
  assetType,
  selectedSymbol,
  selectedExchange,
  onSymbolSelect,
}: TickerStepProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = React.useState('');
  const tickerType = assetType === 'crypto' ? 'crypto' : 'stock';

  const { data: tickerResults = [], isFetching } = useSearchTicker(searchQuery, tickerType);

  const options = tickerResults.map((r) => ({
    value: r.symbol,
    label: r.symbol,
    sublabel: r.exchange ? `${r.name} · ${r.exchange}` : r.name,
    exchange: r.exchange,
    name: r.name,
  }));

  function handleValueChange(value: string): void {
    const found = tickerResults.find((r) => r.symbol === value);
    onSymbolSelect(value, found?.exchange, found?.name);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="ticker-search">
        Buscar {assetType === 'crypto' ? 'criptomoneda' : 'activo'}
      </Label>
      <Combobox
        value={selectedSymbol}
        onValueChange={handleValueChange}
        onSearch={setSearchQuery}
        options={options.map((o) => ({
          value: o.value,
          label: o.label,
          sublabel: o.sublabel,
        }))}
        isLoading={isFetching}
        placeholder={`Buscar por simbolo o nombre...`}
        emptyMessage="No se encontraron activos con ese termino."
      />
      {selectedSymbol && (
        <p className="text-xs text-gray-500">
          Seleccionado: <strong>{selectedSymbol}</strong>
          {selectedExchange && ` — ${selectedExchange}`}
        </p>
      )}
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface HoldingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: HoldingWithValue | null;
}

export default function HoldingFormDialog({
  open,
  onOpenChange,
  editing,
}: HoldingFormDialogProps): React.ReactElement {
  const isEditing = Boolean(editing);

  // Step state — only used in create mode
  const [step, setStep] = React.useState<1 | 2>(1);
  const [selectedAssetType, setSelectedAssetType] = React.useState<AssetType>('crypto');
  const [selectedSymbol, setSelectedSymbol] = React.useState('');
  const [selectedExchange, setSelectedExchange] = React.useState<string | undefined>(undefined);

  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const createMutation = useCreateHolding();
  const updateMutation = useUpdateHolding();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<HoldingFormValues>({
    resolver: zodResolver(holdingSchema),
    defaultValues: {
      accountId: editing?.accountId ?? '',
      quantity: editing?.quantity ?? '',
      averageBuyPrice: editing ? editing.averageBuyPrice / 100 : undefined,
    },
  });

  // Reset form when dialog opens/closes or editing target changes
  React.useEffect(() => {
    if (open) {
      reset({
        accountId: editing?.accountId ?? '',
        quantity: editing?.quantity ?? '',
        averageBuyPrice: editing ? editing.averageBuyPrice / 100 : undefined,
      });
      setStep(1);
      setSelectedSymbol(editing?.symbol ?? '');
      setSelectedExchange(editing?.exchange ?? undefined);
      if (editing) setSelectedAssetType(editing.assetType);
    }
  }, [open, editing, reset]);

  // Filter accounts to investment/crypto types for the select
  const investmentAccounts = accounts.filter(
    (a) => a.isActive && (a.type === 'crypto' || a.type === 'investment'),
  );

  function handleAssetTypeSelect(type: AssetType): void {
    setSelectedAssetType(type);
    setSelectedSymbol('');
    setSelectedExchange(undefined);
    setStep(2);
  }

  function handleSymbolSelect(symbol: string, exchange?: string): void {
    setSelectedSymbol(symbol);
    setSelectedExchange(exchange);
  }

  async function onSubmit(values: HoldingFormValues): Promise<void> {
    if (!isEditing && !selectedSymbol) return;

    if (isEditing && editing) {
      await updateMutation.mutateAsync({
        id: editing._id,
        data: {
          accountId: values.accountId,
          quantity: values.quantity,
          // Backend expects cents
          averageBuyPrice: Math.round(values.averageBuyPrice * 100),
        },
      });
    } else {
      await createMutation.mutateAsync({
        accountId: values.accountId,
        assetType: selectedAssetType,
        symbol: selectedSymbol,
        exchange: selectedExchange,
        quantity: values.quantity,
        // Backend expects cents
        averageBuyPrice: Math.round(values.averageBuyPrice * 100),
        currency: 'EUR',
      });
    }

    onOpenChange(false);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const submitError = createMutation.error?.message ?? updateMutation.error?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar ${editing?.symbol ?? 'posicion'}` : 'Anadir posicion'}
          </DialogTitle>
        </DialogHeader>

        {/* ── CREATE MODE — Step 1: asset type ───────────────────────────── */}
        {!isEditing && step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Selecciona el tipo de activo que quieres anadir:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ASSET_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleAssetTypeSelect(opt.type)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    opt.color,
                  )}
                >
                  {opt.icon}
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="text-xs opacity-70">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── CREATE MODE — Step 2: form ─────────────────────────────────── */}
        {!isEditing && step === 2 && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Back button */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Cambiar tipo de activo
            </button>

            {/* Ticker search */}
            <TickerStep
              assetType={selectedAssetType}
              selectedSymbol={selectedSymbol}
              selectedExchange={selectedExchange}
              onSymbolSelect={handleSymbolSelect}
            />

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                {...register('quantity')}
                aria-invalid={Boolean(errors.quantity)}
              />
              {errors.quantity && (
                <p className="text-xs text-red-600" role="alert">{errors.quantity.message}</p>
              )}
            </div>

            {/* Average buy price */}
            <div className="space-y-1.5">
              <Label htmlFor="averageBuyPrice">Precio medio de compra (€)</Label>
              <Input
                id="averageBuyPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register('averageBuyPrice', { valueAsNumber: true })}
                aria-invalid={Boolean(errors.averageBuyPrice)}
              />
              {errors.averageBuyPrice && (
                <p className="text-xs text-red-600" role="alert">
                  {errors.averageBuyPrice.message}
                </p>
              )}
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <Label htmlFor="accountId">Cuenta</Label>
              {accountsLoading ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : (
                <Controller
                  control={control}
                  name="accountId"
                  render={({ field }) => (
                    <Select
                      id="accountId"
                      {...field}
                      aria-invalid={Boolean(errors.accountId)}
                    >
                      <option value="">Selecciona una cuenta</option>
                      {investmentAccounts.map((acc) => (
                        <option key={acc._id} value={acc._id}>
                          {acc.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              )}
              {errors.accountId && (
                <p className="text-xs text-red-600" role="alert">{errors.accountId.message}</p>
              )}
              {!accountsLoading && investmentAccounts.length === 0 && (
                <p className="text-xs text-amber-600">
                  No tienes cuentas de tipo Cripto o Inversion. Crea una primero.
                </p>
              )}
            </div>

            {submitError && (
              <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
                {submitError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || !selectedSymbol}
              >
                {isPending ? 'Guardando...' : 'Anadir posicion'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ── EDIT MODE ──────────────────────────────────────────────────── */}
        {isEditing && editing && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Read-only info */}
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <p>
                <span className="font-medium">Simbolo:</span> {editing.symbol}
              </p>
              {editing.exchange && (
                <p>
                  <span className="font-medium">Exchange:</span> {editing.exchange}
                </p>
              )}
              <p>
                <span className="font-medium">Tipo:</span> {editing.assetType}
              </p>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                {...register('quantity')}
                aria-invalid={Boolean(errors.quantity)}
              />
              {errors.quantity && (
                <p className="text-xs text-red-600" role="alert">{errors.quantity.message}</p>
              )}
            </div>

            {/* Average buy price */}
            <div className="space-y-1.5">
              <Label htmlFor="averageBuyPrice">Precio medio de compra (€)</Label>
              <Input
                id="averageBuyPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register('averageBuyPrice', { valueAsNumber: true })}
                aria-invalid={Boolean(errors.averageBuyPrice)}
              />
              {errors.averageBuyPrice && (
                <p className="text-xs text-red-600" role="alert">
                  {errors.averageBuyPrice.message}
                </p>
              )}
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <Label htmlFor="accountId">Cuenta</Label>
              {accountsLoading ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : (
                <Controller
                  control={control}
                  name="accountId"
                  render={({ field }) => (
                    <Select
                      id="accountId"
                      {...field}
                      aria-invalid={Boolean(errors.accountId)}
                    >
                      <option value="">Selecciona una cuenta</option>
                      {investmentAccounts.map((acc) => (
                        <option key={acc._id} value={acc._id}>
                          {acc.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              )}
              {errors.accountId && (
                <p className="text-xs text-red-600" role="alert">{errors.accountId.message}</p>
              )}
            </div>

            {submitError && (
              <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
                {submitError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
