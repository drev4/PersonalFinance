import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateDebt, useUpdateDebt } from '../../hooks/useDebts';
import { cn } from '../../lib/utils';
import type { Debt, DebtType } from '../../types/api';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

const PRESET_COLORS = [
  { value: '#ef4444', label: 'Rojo' },
  { value: '#f97316', label: 'Naranja' },
  { value: '#f59e0b', label: 'Amarillo' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#14b8a6', label: 'Teal' },
];

const TYPE_OPTIONS: { value: DebtType; label: string }[] = [
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'personal_loan', label: 'Préstamo personal' },
  { value: 'mortgage', label: 'Hipoteca' },
  { value: 'student_loan', label: 'Préstamo estudiantil' },
  { value: 'car_loan', label: 'Préstamo coche' },
  { value: 'other', label: 'Otro' },
];

const debtFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  type: z.enum(['credit_card', 'personal_loan', 'mortgage', 'student_loan', 'car_loan', 'other']),
  currency: z.string().min(3).max(3).toUpperCase().default('EUR'),
  originalAmount: z
    .number({ invalid_type_error: 'Introduce un importe válido' })
    .positive('El importe original debe ser mayor que 0'),
  currentBalance: z
    .number({ invalid_type_error: 'Introduce un importe válido' })
    .min(0, 'El saldo no puede ser negativo'),
  interestRate: z.number({ invalid_type_error: 'Introduce una tasa válida' }).min(0).max(100),
  minimumPayment: z.number({ invalid_type_error: 'Introduce un importe válido' }).min(0),
  nextPaymentDate: z.string().optional(),
  notes: z.string().max(500).optional(),
  color: z.string().optional(),
});

type DebtFormValues = z.infer<typeof debtFormSchema>;

interface DebtFormDialogProps {
  debt?: Debt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebtFormDialog({
  debt,
  open,
  onOpenChange,
}: DebtFormDialogProps): React.ReactElement {
  const isEditing = Boolean(debt);
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      name: debt?.name ?? '',
      type: debt?.type ?? 'credit_card',
      currency: debt?.currency ?? 'EUR',
      originalAmount: debt ? debt.originalAmount / 100 : 0,
      currentBalance: debt ? debt.currentBalance / 100 : 0,
      interestRate: debt?.interestRate ?? 0,
      minimumPayment: debt ? debt.minimumPayment / 100 : 0,
      nextPaymentDate: debt?.nextPaymentDate ? debt.nextPaymentDate.slice(0, 10) : '',
      notes: debt?.notes ?? '',
      color: debt?.color ?? PRESET_COLORS[0].value,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: debt?.name ?? '',
        type: debt?.type ?? 'credit_card',
        currency: debt?.currency ?? 'EUR',
        originalAmount: debt ? debt.originalAmount / 100 : 0,
        currentBalance: debt ? debt.currentBalance / 100 : 0,
        interestRate: debt?.interestRate ?? 0,
        minimumPayment: debt ? debt.minimumPayment / 100 : 0,
        nextPaymentDate: debt?.nextPaymentDate ? debt.nextPaymentDate.slice(0, 10) : '',
        notes: debt?.notes ?? '',
        color: debt?.color ?? PRESET_COLORS[0].value,
      });
    }
  }, [open, debt, form]);

  const watchedColor = form.watch('color') ?? PRESET_COLORS[0].value;

  async function onSubmit(values: DebtFormValues): Promise<void> {
    const payload = {
      name: values.name,
      type: values.type,
      currency: values.currency.toUpperCase(),
      originalAmount: Math.round(values.originalAmount * 100),
      currentBalance: Math.round(values.currentBalance * 100),
      interestRate: values.interestRate,
      minimumPayment: Math.round(values.minimumPayment * 100),
      nextPaymentDate: values.nextPaymentDate || undefined,
      notes: values.notes || undefined,
      color: values.color,
    };

    if (isEditing && debt) {
      await updateDebt.mutateAsync({ id: debt._id, data: payload });
    } else {
      await createDebt.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const isPending = createDebt.isPending || updateDebt.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar deuda' : 'Nueva deuda'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Hipoteca ING, Tarjeta BBVA..." {...field} />
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
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                        {TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
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
                    <FormLabel>Moneda</FormLabel>
                    <FormControl>
                      <Input placeholder="EUR" maxLength={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Original amount */}
              <FormField
                control={form.control}
                name="originalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deuda original</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Current balance */}
              <FormField
                control={form.control}
                name="currentBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saldo actual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Interest rate */}
              <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interés anual (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Minimum payment */}
              <FormField
                control={form.control}
                name="minimumPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pago mínimo/mes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Next payment date */}
            <FormField
              control={form.control}
              name="nextPaymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próximo pago (opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                    <Input placeholder="Ej: préstamo con seguro de vida..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          aria-label={preset.label}
                          onClick={() => field.onChange(preset.value)}
                          className={cn(
                            'h-7 w-7 rounded-full border-2 transition-transform',
                            field.value === preset.value
                              ? 'scale-125 border-gray-700'
                              : 'border-transparent hover:scale-110',
                          )}
                          style={{ backgroundColor: preset.value }}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color preview strip */}
            <div
              className="h-1.5 w-full rounded-full"
              style={{ backgroundColor: watchedColor }}
              aria-hidden="true"
            />

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
                {isPending
                  ? isEditing
                    ? 'Guardando...'
                    : 'Creando...'
                  : isEditing
                  ? 'Guardar cambios'
                  : 'Crear deuda'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
