import { useEffect } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PiggyBank,
  Home,
  Car,
  Plane,
  GraduationCap,
  Heart,
  Star,
  ShoppingBag,
} from 'lucide-react';
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
import { Button } from '../ui/button';
import { useCreateGoal, useUpdateGoal } from '../../hooks/useGoals';
import type { Goal } from '../../types/api';
import { formatCurrency } from '../../lib/formatters';
import { cn } from '../../lib/utils';

const PRESET_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#f59e0b', label: 'Amarillo' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#14b8a6', label: 'Teal' },
];

const PRESET_ICONS = [
  { value: 'PiggyBank', label: 'Ahorro', Icon: PiggyBank },
  { value: 'Home', label: 'Casa', Icon: Home },
  { value: 'Car', label: 'Coche', Icon: Car },
  { value: 'Plane', label: 'Viaje', Icon: Plane },
  { value: 'GraduationCap', label: 'Educacion', Icon: GraduationCap },
  { value: 'Heart', label: 'Salud', Icon: Heart },
  { value: 'Star', label: 'Especial', Icon: Star },
  { value: 'ShoppingBag', label: 'Compras', Icon: ShoppingBag },
] as const;

const goalFormSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio').max(100),
    targetAmount: z
      .number({ invalid_type_error: 'Introduce un importe valido' })
      .positive('El objetivo debe ser mayor que 0'),
    currentAmount: z
      .number({ invalid_type_error: 'Introduce un importe valido' })
      .min(0, 'El importe ahorrado no puede ser negativo'),
    deadline: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
  })
  .refine((data) => data.currentAmount <= data.targetAmount, {
    message: 'El importe ahorrado no puede superar el objetivo',
    path: ['currentAmount'],
  });

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalFormDialogProps {
  goal?: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalFormDialog({
  goal,
  open,
  onOpenChange,
}: GoalFormDialogProps): React.ReactElement {
  const isEditing = Boolean(goal);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: goal?.name ?? '',
      targetAmount: goal ? goal.targetAmount / 100 : 0,
      currentAmount: goal ? goal.currentAmount / 100 : 0,
      deadline: goal?.deadline ? goal.deadline.slice(0, 10) : '',
      color: goal?.color ?? PRESET_COLORS[0].value,
      icon: goal?.icon ?? 'PiggyBank',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: goal?.name ?? '',
        targetAmount: goal ? goal.targetAmount / 100 : 0,
        currentAmount: goal ? goal.currentAmount / 100 : 0,
        deadline: goal?.deadline ? goal.deadline.slice(0, 10) : '',
        color: goal?.color ?? PRESET_COLORS[0].value,
        icon: goal?.icon ?? 'PiggyBank',
      });
    }
  }, [open, goal, form]);

  const watchedTarget = form.watch('targetAmount') || 0;
  const watchedCurrent = form.watch('currentAmount') || 0;
  const watchedColor = form.watch('color') ?? PRESET_COLORS[0].value;
  const progressPct =
    watchedTarget > 0 ? Math.min(100, (watchedCurrent / watchedTarget) * 100) : 0;

  async function onSubmit(values: GoalFormValues): Promise<void> {
    const payload = {
      name: values.name,
      targetAmount: Math.round(values.targetAmount * 100),
      currentAmount: Math.round(values.currentAmount * 100),
      deadline: values.deadline || undefined,
      color: values.color,
      icon: values.icon,
    };

    if (isEditing && goal) {
      await updateGoal.mutateAsync({ id: goal._id, data: payload });
    } else {
      await createGoal.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const isPending = createGoal.isPending || updateGoal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar meta' : 'Nueva meta de ahorro'}
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
                  <FormLabel>Nombre de la meta</FormLabel>
                  <FormControl>
                    <Input placeholder="Vacaciones, Coche nuevo, Fondo de emergencia..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Target amount */}
              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? 0 : parseFloat(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Current amount */}
              <FormField
                control={form.control}
                name="currentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ya ahorrado (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? 0 : parseFloat(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Deadline */}
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha limite (opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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

            {/* Icon */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icono</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_ICONS.map(({ value, label, Icon }) => (
                        <button
                          key={value}
                          type="button"
                          aria-label={label}
                          onClick={() => field.onChange(value)}
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-colors',
                            field.value === value
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50',
                          )}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview */}
            <div className="rounded-lg bg-gray-50 p-4 space-y-2">
              <p className="text-xs font-medium text-gray-500">Vista previa</p>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {formatCurrency(Math.round(watchedCurrent * 100), 'EUR')}
                </span>
                <span className="text-gray-500">
                  de {formatCurrency(Math.round(watchedTarget * 100), 'EUR')}
                </span>
                <span className="font-semibold" style={{ color: watchedColor }}>
                  {progressPct.toFixed(1)}%
                </span>
              </div>
              <div
                className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, progressPct)}%`,
                    backgroundColor: watchedColor,
                  }}
                />
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
                    : 'Crear meta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
