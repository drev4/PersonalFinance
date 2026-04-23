import { useEffect } from 'react';
import type React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { useCreateBudget, useUpdateBudget } from '../../hooks/useBudgets';
import { useCategories } from '../../hooks/useCategories';
import type { Budget } from '../../types/api';
import { formatCurrency } from '../../lib/formatters';

const budgetItemSchema = z.object({
  categoryId: z.string().min(1, 'Selecciona una categoria'),
  amount: z
    .number({ invalid_type_error: 'Introduce un importe valido' })
    .positive('El importe debe ser mayor que 0'),
});

const budgetFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  period: z.enum(['monthly', 'yearly']),
  startDate: z.string().min(1, 'La fecha de inicio es obligatoria'),
  rollover: z.boolean(),
  items: z
    .array(budgetItemSchema)
    .min(1, 'Añade al menos una categoria al presupuesto'),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetFormDialogProps {
  budget?: Budget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BudgetFormDialog({
  budget,
  open,
  onOpenChange,
}: BudgetFormDialogProps): React.ReactElement {
  const isEditing = Boolean(budget);
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const { data: categories = [] } = useCategories();

  const expenseCategories = categories.filter((c) => c.type === 'expense' && c.isActive);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: budget?.name ?? '',
      period: budget?.period ?? 'monthly',
      startDate: budget?.startDate
        ? budget.startDate.slice(0, 10)
        : todayISO(),
      rollover: budget?.rollover ?? false,
      items: budget?.items.map((item) => ({
        categoryId: item.categoryId,
        amount: item.amount / 100,
      })) ?? [{ categoryId: '', amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      form.reset({
        name: budget?.name ?? '',
        period: budget?.period ?? 'monthly',
        startDate: budget?.startDate
          ? budget.startDate.slice(0, 10)
          : todayISO(),
        rollover: budget?.rollover ?? false,
        items: budget?.items.map((item) => ({
          categoryId: item.categoryId,
          amount: item.amount / 100,
        })) ?? [{ categoryId: '', amount: 0 }],
      });
    }
  }, [open, budget, form]);

  const watchedItems = form.watch('items');
  const totalBudgeted = watchedItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  async function onSubmit(values: BudgetFormValues): Promise<void> {
    const payload = {
      name: values.name,
      period: values.period,
      startDate: values.startDate,
      rollover: values.rollover,
      items: values.items.map((item) => ({
        categoryId: item.categoryId,
        amount: Math.round(item.amount * 100),
      })),
    };

    if (isEditing && budget) {
      await updateBudget.mutateAsync({ id: budget._id, data: payload });
    } else {
      await createBudget.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const isPending = createBudget.isPending || updateBudget.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
          </DialogTitle>
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
                    <Input placeholder="Presupuesto mensual, Vacaciones..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Period */}
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodo</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="monthly">Mensual</option>
                        <option value="yearly">Anual</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de inicio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Rollover */}
            <FormField
              control={form.control}
              name="rollover"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="rollover"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <FormLabel htmlFor="rollover" className="cursor-pointer font-normal">
                      Rollover — trasladar el saldo no gastado al siguiente periodo
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Items */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Categorias del presupuesto
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ categoryId: '', amount: 0 })}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Anadir categoria
                </Button>
              </div>

              {form.formState.errors.items?.root?.message && (
                <p className="mb-2 text-xs font-medium text-red-600">
                  {form.formState.errors.items.root.message}
                </p>
              )}
              {form.formState.errors.items?.message && (
                <p className="mb-2 text-xs font-medium text-red-600">
                  {form.formState.errors.items.message}
                </p>
              )}

              <div className="space-y-2.5">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <FormField
                      control={form.control}
                      name={`items.${index}.categoryId`}
                      render={({ field: f }) => (
                        <FormItem className="flex-1">
                          {index === 0 && <FormLabel>Categoria</FormLabel>}
                          <FormControl>
                            <Select {...f}>
                              <option value="">Selecciona categoria...</option>
                              {expenseCategories.map((cat) => (
                                <option key={cat._id} value={cat._id}>
                                  {cat.name}
                                </option>
                              ))}
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.amount`}
                      render={({ field: f }) => (
                        <FormItem className="w-36">
                          {index === 0 && <FormLabel>Importe (€)</FormLabel>}
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              {...f}
                              onChange={(e) =>
                                f.onChange(
                                  e.target.value === '' ? 0 : parseFloat(e.target.value),
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className={index === 0 ? 'mt-7' : ''}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="text-red-500 hover:bg-red-50 hover:text-red-700 px-2"
                        aria-label="Eliminar categoria"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-gray-600">Total presupuestado</span>
                <span className="text-base font-semibold text-gray-900">
                  {formatCurrency(Math.round(totalBudgeted * 100), 'EUR')}
                </span>
              </div>
            </div>

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
                    : 'Crear presupuesto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
