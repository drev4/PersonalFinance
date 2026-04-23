import { useEffect } from 'react';
import type React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CURRENCIES } from '@finanzas/shared';
import { useCurrencyConverter } from '../../hooks/useCurrency';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../ui/form';
import { useCreateAccount, useUpdateAccount } from '../../hooks/useAccounts';
import type { Account } from '../../types/api';
import { getAccountTypeLabel } from '../../lib/formatters';

const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'cash',
  'credit_card',
  'real_estate',
  'vehicle',
  'loan',
  'mortgage',
  'crypto',
  'investment',
  'other',
] as const;

const PRESET_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

const accountFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Maximo 100 caracteres'),
  type: z.enum([
    'checking',
    'savings',
    'cash',
    'credit_card',
    'real_estate',
    'vehicle',
    'loan',
    'mortgage',
    'crypto',
    'investment',
    'other',
  ]),
  currency: z.string().length(3, 'Selecciona una divisa valida'),
  initialBalance: z.number({ invalid_type_error: 'Ingresa un numero valido' }).min(0, 'El saldo no puede ser negativo'),
  institution: z.string().optional(),
  notes: z.string().optional(),
  color: z.string().optional(),
  includedInNetWorth: z.boolean().optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountFormDialogProps {
  account?: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountFormDialog({
  account,
  open,
  onOpenChange,
}: AccountFormDialogProps): React.ReactElement {
  const isEdit = Boolean(account);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const { convert, baseCurrency } = useCurrencyConverter();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      type: 'checking',
      currency: 'EUR',
      initialBalance: 0,
      institution: '',
      notes: '',
      color: PRESET_COLORS[0],
      includedInNetWorth: true,
    },
  });

  useEffect(() => {
    if (open && account) {
      form.reset({
        name: account.name,
        type: account.type,
        currency: account.currency,
        // Display in euros (backend stores in cents)
        initialBalance: account.initialBalance / 100,
        institution: account.institution ?? '',
        notes: account.notes ?? '',
        color: account.color ?? PRESET_COLORS[0],
        includedInNetWorth: account.includedInNetWorth,
      });
    } else if (open && !account) {
      form.reset({
        name: '',
        type: 'checking',
        currency: 'EUR',
        initialBalance: 0,
        institution: '',
        notes: '',
        color: PRESET_COLORS[0],
        includedInNetWorth: true,
      });
    }
  }, [open, account, form]);

  const watchedCurrency = useWatch({ control: form.control, name: 'currency' });
  const watchedBalance = useWatch({ control: form.control, name: 'initialBalance' });

  const showConversion =
    watchedCurrency &&
    watchedCurrency.toUpperCase() !== baseCurrency.toUpperCase() &&
    watchedBalance > 0;

  const convertedBalance = showConversion
    ? convert(watchedBalance, watchedCurrency, baseCurrency)
    : null;

  const isPending = createAccount.isPending || updateAccount.isPending;

  function onSubmit(values: AccountFormValues): void {
    // Convert euros to cents before sending to backend
    const payload = {
      ...values,
      initialBalance: Math.round(values.initialBalance * 100),
    };

    if (isEdit && account) {
      updateAccount.mutate(
        { id: account._id, data: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createAccount.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cuenta nomina BBVA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {ACCOUNT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {getAccountTypeLabel(t)}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Divisa *</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Initial balance */}
            <FormField
              control={form.control}
              name="initialBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo inicial *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  {showConversion && (
                    <p className="text-xs text-gray-500 mt-1">
                      {convertedBalance !== null
                        ? `≈ ${convertedBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${baseCurrency} (tipo de cambio aproximado)`
                        : 'Calculando conversión...'}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Institution */}
            <FormField
              control={form.control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entidad (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: BBVA, Santander..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Notas adicionales..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color picker */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 ${
                            field.value === color
                              ? 'border-gray-900 scale-110'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Color ${color}`}
                          aria-pressed={field.value === color}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* includedInNetWorth */}
            <FormField
              control={form.control}
              name="includedInNetWorth"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value ?? true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">
                      Incluir en patrimonio neto
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cuenta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
