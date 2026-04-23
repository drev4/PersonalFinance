import type React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, TrendingUp, Mail } from 'lucide-react';
import { useForgotPassword } from '../../hooks/useAuth';
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

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingresa un correo electrónico válido'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage(): React.ReactElement {
  const forgotPasswordMutation = useForgotPassword();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  function onSubmit(values: ForgotPasswordFormValues): void {
    forgotPasswordMutation.mutate(values.email);
  }

  const apiErrorMessage =
    forgotPasswordMutation.error instanceof Error
      ? forgotPasswordMutation.error.message
      : forgotPasswordMutation.isError
        ? 'Ocurrió un error. Intenta de nuevo.'
        : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <TrendingUp className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Finanzas App</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recuperar contraseña</CardTitle>
            <CardDescription>
              Ingresa tu correo electrónico y te enviaremos instrucciones para
              restablecer tu contraseña.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {forgotPasswordMutation.isSuccess ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <Mail className="h-7 w-7 text-green-600" aria-hidden="true" />
                </div>
                <p className="text-gray-700">
                  Si existe una cuenta asociada a ese correo, recibirás un enlace
                  para restablecer tu contraseña en los próximos minutos.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Revisa también tu carpeta de spam.
                </p>
              </div>
            ) : (
              <>
                {apiErrorMessage && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{apiErrorMessage}</AlertDescription>
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
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo electrónico</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="nombre@ejemplo.com"
                              autoComplete="email"
                              disabled={forgotPasswordMutation.isPending}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={forgotPasswordMutation.isPending}
                    >
                      {forgotPasswordMutation.isPending ? (
                        <>
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          Enviando...
                        </>
                      ) : (
                        'Enviar instrucciones'
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
              Volver al inicio de sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
