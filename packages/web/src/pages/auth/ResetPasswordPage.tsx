import { useState } from 'react';
import type React from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { useResetPassword } from '../../hooks/useAuth';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, 'La contrasena es requerida')
      .min(8, 'La contrasena debe tener al menos 8 caracteres')
      .regex(/\d/, 'La contrasena debe contener al menos un numero'),
    confirmPassword: z.string().min(1, 'Confirma tu contrasena'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage(): React.ReactElement {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const resetPasswordMutation = useResetPassword();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  function onSubmit(values: ResetPasswordFormValues): void {
    if (!token) return;
    resetPasswordMutation.mutate(
      { token, newPassword: values.newPassword },
      {
        onSuccess: () => {
          setTimeout(() => {
            void navigate('/login', {
              state: { message: 'Contrasena restablecida exitosamente. Inicia sesion.' },
            });
          }, 2000);
        },
      },
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-12">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle
                className="mx-auto mb-4 h-16 w-16 text-red-500"
                aria-hidden="true"
              />
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Enlace invalido
              </h2>
              <p className="mb-6 text-gray-600">
                El enlace de restablecimiento es invalido o ha expirado.
              </p>
              <Link to="/forgot-password">
                <Button className="w-full">Solicitar nuevo enlace</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const apiErrorMessage =
    resetPasswordMutation.error instanceof Error
      ? resetPasswordMutation.error.message
      : resetPasswordMutation.isError
        ? 'El enlace es invalido o ha expirado. Solicita uno nuevo.'
        : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo y titulo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <TrendingUp className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Finanzas App</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Nueva contrasena</CardTitle>
            <CardDescription>
              Ingresa tu nueva contrasena para restablecer el acceso a tu cuenta.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {resetPasswordMutation.isSuccess ? (
              <div className="text-center">
                <CheckCircle
                  className="mx-auto mb-4 h-16 w-16 text-green-500"
                  aria-hidden="true"
                />
                <p className="text-gray-700">
                  Contrasena restablecida exitosamente. Seras redirigido al inicio de
                  sesion.
                </p>
              </div>
            ) : (
              <>
                {apiErrorMessage && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{apiErrorMessage}</AlertDescription>
                    {resetPasswordMutation.isError && (
                      <div className="mt-2">
                        <Link
                          to="/forgot-password"
                          className="text-sm font-medium underline hover:no-underline"
                        >
                          Solicitar nuevo enlace
                        </Link>
                      </div>
                    )}
                  </Alert>
                )}

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    noValidate
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nueva contrasena</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                disabled={resetPasswordMutation.isPending}
                                className="pr-10"
                                {...field}
                              />
                            </FormControl>
                            <button
                              type="button"
                              aria-label={
                                showPassword
                                  ? 'Ocultar contrasena'
                                  : 'Mostrar contrasena'
                              }
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar contrasena</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                disabled={resetPasswordMutation.isPending}
                                className="pr-10"
                                {...field}
                              />
                            </FormControl>
                            <button
                              type="button"
                              aria-label={
                                showConfirmPassword
                                  ? 'Ocultar confirmacion'
                                  : 'Mostrar confirmacion'
                              }
                              onClick={() => setShowConfirmPassword((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={resetPasswordMutation.isPending}
                    >
                      {resetPasswordMutation.isPending ? (
                        <>
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          Restableciendo...
                        </>
                      ) : (
                        'Restablecer contrasena'
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </CardContent>

          <CardFooter className="justify-center">
            <Link
              to="/login"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            >
              Volver al inicio de sesion
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
