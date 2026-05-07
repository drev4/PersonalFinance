import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useEffect } from 'react';
import type React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreateTransfer } from '../../hooks/useTransactions';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, 'Selecciona la cuenta origen'),
    toAccountId: z.string().min(1, 'Selecciona la cuenta destino'),
    amount: z.coerce
      .number({ message: 'Ingresa un importe valido' })
      .positive('El importe debe ser positivo'),
    exchangeRate: z.coerce
      .number({ message: 'Ingresa un tipo de cambio valido' })
      .positive('El tipo de cambio debe ser positivo')
      .optional(),
    date: z.string().min(1, 'La fecha es obligatoria'),
    description: z.string().min(1, 'La descripcion es obligatoria'),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Las cuentas origen y destino no pueden ser la misma',
    path: ['toAccountId'],
  });

type TransferFormValues = z.infer<typeof transferSchema>;

interface TransferFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferFormDialog({
  open,
  onOpenChange,
}: TransferFormDialogProps): React.ReactElement {
  const createTransfer = useCreateTransfer();
  const { data: accounts } = useAccounts();
  const today = format(new Date(), 'yyyy-MM-dd');

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccountId: '',
      toAccountId: '',
      amount: 0,
      exchangeRate: undefined,
      date: today,
      description: 'Transferencia',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        fromAccountId: accounts?.[0]?._id ?? '',
        toAccountId: accounts?.[1]?._id ?? '',
        amount: 0,
        exchangeRate: undefined,
        date: today,
        description: 'Transferencia',
      });
    }
  }, [open, accounts, form, today]);

  const fromAccountId = useWatch({ control: form.control, name: 'fromAccountId' });
  const toAccountId = useWatch({ control: form.control, name: 'toAccountId' });
  const amount = useWatch({ control: form.control, name: 'amount' });
  const exchangeRate = useWatch({ control: form.control, name: 'exchangeRate' });

  const fromAccount = accounts?.find((a) => a._id === fromAccountId);
  const toAccount = accounts?.find((a) => a._id === toAccountId);
  const isCrossCurrency =
    fromAccount !== undefined &&
    toAccount !== undefined &&
    fromAccount.currency !== toAccount.currency;

  const toAmount =
    isCrossCurrency && exchangeRate && exchangeRate > 0 && amount > 0
      ? (amount * exchangeRate).toFixed(2)
      : null;

  function onSubmit(values: TransferFormValues): void {
    createTransfer.mutate(
      {
        ...values,
        amount: Math.round(values.amount * 100),
        exchangeRate: isCrossCurrency ? values.exchangeRate : undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva transferencia</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* From account */}
            <FormField
              control={form.control}
              name="fromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta origen *</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">Selecciona cuenta origen</option>
                      {accounts?.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name} ({a.currency})
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* To account */}
            <FormField
              control={form.control}
              name="toAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta destino *</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">Selecciona cuenta destino</option>
                      {accounts?.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name} ({a.currency})
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Importe{fromAccount ? ` (${fromAccount.currency})` : ''} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Exchange rate — only shown for cross-currency transfers */}
            {isCrossCurrency && (
              <FormField
                control={form.control}
                name="exchangeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tipo de cambio ({fromAccount!.currency} → {toAccount!.currency}) *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        min="0.000001"
                        placeholder="1.00"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    {toAmount !== null && (
                      <p className="text-sm text-muted-foreground">
                        El destinatario recibirá{' '}
                        <span className="font-semibold">
                          {toAmount} {toAccount!.currency}
                        </span>
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Transferencia mensual" {...field} />
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
              <Button type="submit" disabled={createTransfer.isPending}>
                {createTransfer.isPending ? 'Transfiriendo...' : 'Transferir'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
