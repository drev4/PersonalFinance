import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, ShieldCheck, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { useLogin, useCompleteTwoFactorLogin } from '../../hooks/useAuth';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const totpSchema = z.object({
  totpCode: z
    .string()
    .length(6, 'El código debe tener 6 dígitos')
    .regex(/^\d{6}$/, 'Solo se permiten números'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type TotpFormValues = z.infer<typeof totpSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage(): React.ReactElement {
  const [showPassword, setShowPassword] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);

  const loginMutation = useLogin((token) => setTempToken(token));
  const twoFactorMutation = useCompleteTwoFactorLogin();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const totpForm = useForm<TotpFormValues>({
    resolver: zodResolver(totpSchema),
    defaultValues: { totpCode: '' },
  });

  function onLoginSubmit(values: LoginFormValues): void {
    loginMutation.mutate(values);
  }

  function onTotpSubmit(values: TotpFormValues): void {
    if (!tempToken) return;
    twoFactorMutation.mutate({ tempToken, totpCode: values.totpCode });
  }

  const loginError =
    loginMutation.error instanceof Error
      ? loginMutation.error.message
      : loginMutation.isError
      ? 'Credenciales incorrectas. Intenta de nuevo.'
      : null;

  const totpError =
    twoFactorMutation.error instanceof Error
      ? twoFactorMutation.error.message
      : twoFactorMutation.isError
      ? 'Código inválido o expirado. Intenta de nuevo.'
      : null;

  // ── 2FA step ──
  if (tempToken !== null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
              <TrendingUp className="h-8 w-8 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Finanzas App</h1>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary-600" aria-hidden="true" />
                <CardTitle className="text-xl">Verificación en dos pasos</CardTitle>
              </div>
              <CardDescription>
                Abre tu app de autenticación e introduce el código de 6 dígitos.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {totpError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{totpError}</AlertDescription>
                </Alert>
              )}

              <Form {...totpForm}>
                <form
                  onSubmit={totpForm.handleSubmit(onTotpSubmit)}
                  noValidate
                  className="space-y-4"
                >
                  <FormField
                    control={totpForm.control}
                    name="totpCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de verificación</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="000000"
                            maxLength={6}
                            autoFocus
                            autoComplete="one-time-code"
                            className="text-center text-2xl tracking-widest"
                            disabled={twoFactorMutation.isPending}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={twoFactorMutation.isPending}>
                    {twoFactorMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Verificando...
                      </>
                    ) : (
                      'Verificar'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>

            <CardFooter className="justify-center">
              <button
                type="button"
                onClick={() => setTempToken(null)}
                className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
              >
                Volver al inicio de sesión
              </button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // ── Credentials step ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <TrendingUp className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Finanzas App</h1>
          <p className="mt-1 text-sm text-gray-500">Gestion de finanzas personales</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Iniciar sesion</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder a tu cuenta</CardDescription>
          </CardHeader>

          <CardContent>
            {loginError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                noValidate
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electronico</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="nombre@ejemplo.com"
                          autoComplete="email"
                          disabled={loginMutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contrasena</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            disabled={loginMutation.isPending}
                            className="pr-10"
                            {...field}
                          />
                        </FormControl>
                        <button
                          type="button"
                          aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
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

                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  >
                    Olvidaste tu contrasena?
                  </Link>
                </div>

                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Iniciando sesion...
                    </>
                  ) : (
                    'Iniciar sesion'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-sm text-gray-500">
              No tienes cuenta?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              >
                Crear cuenta
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
