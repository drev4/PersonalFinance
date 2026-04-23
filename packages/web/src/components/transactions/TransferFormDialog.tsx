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
import { Select } from '../ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../ui/form';
import { useCreateTransfer } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { format } from 'date-fns';

const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, 'Selecciona la cuenta origen'),
    toAccountId: z.string().min(1, 'Selecciona la cuenta destino'),
    amount: z
      .number({ invalid_type_error: 'Ingresa un importe valido' })
      .positive('El importe debe ser positivo'),
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
        date: today,
        description: 'Transferencia',
      });
    }
  }, [open, accounts, form, today]);

  function onSubmit(values: TransferFormValues): void {
    createTransfer.mutate(
      {
        ...values,
        amount: Math.round(values.amount * 100),
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
                          {a.name}
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
                          {a.name}
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
                    <FormLabel>Importe *</FormLabel>
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
