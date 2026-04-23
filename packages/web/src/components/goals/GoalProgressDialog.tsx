import { useEffect } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Progress } from '../ui/progress';
import { useUpdateGoal } from '../../hooks/useGoals';
import type { Goal } from '../../types/api';
import { formatCurrency } from '../../lib/formatters';

const progressSchema = z.object({
  currentAmount: z
    .number({ invalid_type_error: 'Introduce un importe valido' })
    .min(0, 'El importe no puede ser negativo'),
});

type ProgressFormValues = z.infer<typeof progressSchema>;

interface GoalProgressDialogProps {
  goal: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalProgressDialog({
  goal,
  open,
  onOpenChange,
}: GoalProgressDialogProps): React.ReactElement {
  const updateGoal = useUpdateGoal();

  const form = useForm<ProgressFormValues>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      currentAmount: goal.currentAmount / 100,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ currentAmount: goal.currentAmount / 100 });
    }
  }, [open, goal, form]);

  const watchedCurrent = form.watch('currentAmount') || 0;
  // watchedCurrent is in euros, goal.targetAmount is in cents
  const targetInEuros = goal.targetAmount / 100;
  const pct =
    targetInEuros > 0 ? Math.min(100, (watchedCurrent / targetInEuros) * 100) : 0;

  async function onSubmit(values: ProgressFormValues): Promise<void> {
    await updateGoal.mutateAsync({
      id: goal._id,
      data: { currentAmount: Math.round(values.currentAmount * 100) },
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Actualizar progreso</DialogTitle>
        </DialogHeader>

        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-gray-800">{goal.name}</p>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Actualmente: {formatCurrency(goal.currentAmount, 'EUR')}</span>
            <span>Objetivo: {formatCurrency(goal.targetAmount, 'EUR')}</span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-right text-xs text-gray-400">{pct.toFixed(1)}% conseguido</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuevo importe ahorrado (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      autoFocus
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateGoal.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateGoal.isPending}>
                {updateGoal.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
