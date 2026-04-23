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
  DialogClose,
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
import { useAdjustBalance } from '../../hooks/useAccounts';
import type { Account } from '../../types/api';
import { formatCurrency } from '../../lib/formatters';

const adjustSchema = z.object({
  newBalance: z
    .number({ invalid_type_error: 'Ingresa un numero valido' })
    .min(-999_999_999, 'Valor demasiado bajo'),
  note: z.string().optional(),
});

type AdjustFormValues = z.infer<typeof adjustSchema>;

interface AdjustBalanceDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdjustBalanceDialog({
  account,
  open,
  onOpenChange,
}: AdjustBalanceDialogProps): React.ReactElement {
  const adjustBalance = useAdjustBalance();

  const form = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      newBalance: account.currentBalance / 100,
      note: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        newBalance: account.currentBalance / 100,
        note: '',
      });
    }
  }, [open, account.currentBalance, form]);

  function onSubmit(values: AdjustFormValues): void {
    adjustBalance.mutate(
      {
        id: account._id,
        newBalance: Math.round(values.newBalance * 100),
        note: values.note || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar saldo</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500">
          Saldo actual:{' '}
          <span className="font-semibold text-gray-900">
            {formatCurrency(account.currentBalance, account.currency)}
          </span>
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="newBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuevo saldo *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (opcional)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      placeholder="Motivo del ajuste..."
                      {...field}
                    />
                  </FormControl>
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
              <Button type="submit" disabled={adjustBalance.isPending}>
                {adjustBalance.isPending ? 'Ajustando...' : 'Ajustar saldo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
