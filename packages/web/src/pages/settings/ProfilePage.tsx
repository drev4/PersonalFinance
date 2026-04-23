import { useState } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '../../components/ui/form';
import { useAuthStore } from '../../stores/authStore';
import { updateMe } from '../../api/auth.api';

// ─── Schema ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  baseCurrency: z
    .string()
    .length(3, 'Debe ser un codigo de 3 letras (ej: EUR, USD)')
    .regex(/^[A-Z]{3}$/, 'Solo letras mayusculas (ej: EUR, USD)'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ─── Currency options ─────────────────────────────────────────────────────────

const COMMON_CURRENCIES = ['EUR', 'USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'GBP'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage(): React.ReactElement {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      baseCurrency: user?.baseCurrency ?? 'EUR',
    },
  });

  async function handleSubmit(values: ProfileFormValues): Promise<void> {
    setError(null);
    try {
      const updated = await updateMe({ name: values.name, baseCurrency: values.baseCurrency });
      if (accessToken) setAuth(updated, accessToken);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.');
    }
  }

  const displayName = user?.name || user?.email || 'Usuario';

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona tu informacion personal y preferencias.
        </p>
      </div>

      {/* Avatar + email summary */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <span className="text-xl font-bold" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{displayName}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Profile form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" aria-hidden="true" />
            <CardTitle className="text-base">Informacion personal</CardTitle>
          </div>
          <CardDescription>
            Actualiza tu nombre y moneda base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Tu nombre completo" autoComplete="name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email — read-only */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Correo electronico
                </label>
                <Input
                  value={user?.email ?? ''}
                  readOnly
                  disabled
                  className="bg-gray-50 text-gray-500"
                  aria-label="Correo electronico (no editable)"
                />
                <p className="text-xs text-gray-400">
                  El correo no se puede cambiar desde aqui.
                </p>
              </div>

              {/* Base currency */}
              <FormField
                control={form.control}
                name="baseCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda base</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="EUR"
                        maxLength={3}
                        className="uppercase w-32"
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Monedas comunes:{' '}
                      {COMMON_CURRENCIES.map((c, i) => (
                        <span key={c}>
                          <button
                            type="button"
                            onClick={() => field.onChange(c)}
                            className="font-medium text-primary-600 hover:underline focus-visible:outline-none"
                          >
                            {c}
                          </button>
                          {i < COMMON_CURRENCIES.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                {saved && (
                  <p className="text-sm text-green-600 font-medium" role="status">
                    Guardado correctamente
                  </p>
                )}
                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
