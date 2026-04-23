import { useState } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';
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
import { Alert, AlertDescription } from '../ui/alert';
import { useExportCsv } from '../../hooks/useReports';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';

const exportSchema = z.object({
  from: z.string().min(1, 'La fecha de inicio es requerida'),
  to: z.string().min(1, 'La fecha de fin es requerida'),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.string().optional(),
});

type ExportFormValues = z.infer<typeof exportSchema>;

function getFirstDayOfCurrentMonth(): string {
  const now = new Date();
  return format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
}

function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function ExportCsvForm(): React.ReactElement {
  const [downloadingMessage, setDownloadingMessage] = useState<string | null>(null);
  const exportCsv = useExportCsv();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      from: getFirstDayOfCurrentMonth(),
      to: getToday(),
      accountId: '',
      categoryId: '',
      type: '',
    },
  });

  function onSubmit(values: ExportFormValues): void {
    const filters = {
      from: values.from,
      to: values.to,
      accountId: values.accountId || undefined,
      categoryId: values.categoryId || undefined,
      type: values.type || undefined,
    };

    exportCsv.mutate(filters, {
      onSuccess: () => {
        setDownloadingMessage('Descargando transacciones.csv...');
        setTimeout(() => setDownloadingMessage(null), 3_000);
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* From date */}
          <FormField
            control={form.control}
            name="from"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desde</FormLabel>
                <FormControl>
                  <Input type="date" {...field} max={form.watch('to') || getToday()} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* To date */}
          <FormField
            control={form.control}
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hasta</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    min={form.watch('from') || undefined}
                    max={getToday()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Account */}
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuenta (opcional)</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <option value="">Todas las cuentas</option>
                    {accounts?.map((account) => (
                      <option key={account._id} value={account._id}>
                        {account.name}
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
                <FormLabel>Categoria (opcional)</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <option value="">Todas las categorias</option>
                    {categories?.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo (opcional)</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <option value="">Todos los tipos</option>
                    <option value="income">Ingresos</option>
                    <option value="expense">Gastos</option>
                    <option value="transfer">Transferencias</option>
                    <option value="adjustment">Ajustes</option>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Compatibility note */}
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>
            Compatible con Excel, Google Sheets y aplicaciones de contabilidad.
          </span>
        </div>

        {/* Download status message */}
        {downloadingMessage && (
          <Alert className="mt-3">
            <AlertDescription className="flex items-center gap-2">
              <Download className="h-4 w-4" aria-hidden="true" />
              {downloadingMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit */}
        <div className="mt-4">
          <Button
            type="submit"
            disabled={exportCsv.isPending}
            className="gap-2"
          >
            {exportCsv.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" aria-hidden="true" />
                Exportar CSV
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
