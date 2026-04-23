import { useEffect, useState, KeyboardEvent } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
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
import { useCreateTransaction, useUpdateTransaction } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import type { Transaction } from '../../types/api';
import { format } from 'date-fns';

const transactionSchema = z.object({
  description: z.string().min(1, 'La descripcion es obligatoria').max(200),
  amount: z
    .number({ invalid_type_error: 'Ingresa un importe valido' })
    .positive('El importe debe ser positivo'),
  date: z.string().min(1, 'La fecha es obligatoria'),
  accountId: z.string().min(1, 'Selecciona una cuenta'),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormDialogProps {
  type: 'income' | 'expense';
  transaction?: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionFormDialog({
  type,
  transaction,
  open,
  onOpenChange,
}: TransactionFormDialogProps): React.ReactElement {
  const isEdit = Boolean(transaction);
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const filteredCategories = categories?.filter((c) => c.type === type && c.isActive) ?? [];

  const today = format(new Date(), 'yyyy-MM-dd');

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: '',
      amount: 0,
      date: today,
      accountId: '',
      categoryId: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open && transaction) {
      form.reset({
        description: transaction.description,
        amount: transaction.amount / 100,
        date: transaction.date.slice(0, 10),
        accountId: transaction.accountId,
        categoryId: transaction.categoryId ?? '',
        notes: '',
      });
      setTags(transaction.tags);
    } else if (open && !transaction) {
      form.reset({
        description: '',
        amount: 0,
        date: today,
        accountId: accounts?.[0]?._id ?? '',
        categoryId: '',
        notes: '',
      });
      setTags([]);
    }
  }, [open, transaction, form, accounts, today]);

  const isPending = createTransaction.isPending || updateTransaction.isPending;

  function addTag(value: string): void {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function removeTag(tag: string): void {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function onSubmit(values: TransactionFormValues): void {
    const selectedAccount = accounts?.find((a) => a._id === values.accountId);
    const currency = selectedAccount?.currency ?? 'EUR';

    const payload = {
      ...values,
      amount: Math.round(values.amount * 100),
      currency,
      type,
      tags,
      categoryId: values.categoryId || undefined,
    };

    if (isEdit && transaction) {
      updateTransaction.mutate(
        { id: transaction._id, data: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createTransaction.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  const title =
    type === 'income'
      ? isEdit
        ? 'Editar ingreso'
        : 'Nuevo ingreso'
      : isEdit
        ? 'Editar gasto'
        : 'Nuevo gasto';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Compra supermercado" {...field} />
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

            {/* Account */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta *</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">Selecciona una cuenta</option>
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

            {/* Category */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">Sin categoria</option>
                      {filteredCategories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Etiquetas
              </label>
              <div className="flex min-h-[40px] w-full flex-wrap gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-primary-500 hover:text-primary-700"
                      aria-label={`Eliminar etiqueta ${tag}`}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => tagInput && addTag(tagInput)}
                  placeholder={tags.length === 0 ? 'Escribe y presiona Enter o coma...' : ''}
                  className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[70px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      placeholder="Notas adicionales..."
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
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
