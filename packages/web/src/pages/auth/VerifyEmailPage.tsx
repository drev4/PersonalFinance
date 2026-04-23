import { useEffect, useState } from 'react';
import type React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { verifyEmail } from '../../api/auth.api';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
} from '../../components/ui/card';

export default function VerifyEmailPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [hasAttempted, setHasAttempted] = useState(false);

  const verifyMutation = useMutation<void, Error, string>({
    mutationFn: verifyEmail,
  });

  useEffect(() => {
    if (token && !hasAttempted) {
      setHasAttempted(true);
      verifyMutation.mutate(token);
    }
  // Run only once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <TrendingUp className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Finanzas App</h1>
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            {/* Estado: sin token */}
            {!token && (
              <>
                <AlertCircle
                  className="mx-auto mb-4 h-16 w-16 text-red-500"
                  aria-hidden="true"
                />
                <h2 className="mb-2 text-xl font-semibold text-gray-900">
                  Enlace de verificación inválido
                </h2>
                <p className="text-gray-600">
                  El enlace de verificación no contiene un token válido.
                </p>
              </>
            )}

            {/* Estado: cargando */}
            {token && verifyMutation.isPending && (
              <>
                <Loader2
                  className="mx-auto mb-4 h-16 w-16 animate-spin text-primary-600"
                  aria-hidden="true"
                />
                <h2 className="mb-2 text-xl font-semibold text-gray-900">
                  Verificando tu correo...
                </h2>
                <p className="text-gray-600">Por favor espera un momento.</p>
              </>
            )}

            {/* Estado: éxito */}
            {token && verifyMutation.isSuccess && (
              <>
                <CheckCircle
                  className="mx-auto mb-4 h-16 w-16 text-green-500"
                  aria-hidden="true"
                />
                <h2 className="mb-2 text-xl font-semibold text-gray-900">
                  Correo verificado
                </h2>
                <p className="text-gray-600">
                  Tu correo electrónico ha sido verificado exitosamente. Ya puedes
                  iniciar sesión.
                </p>
              </>
            )}

            {/* Estado: error */}
            {token && verifyMutation.isError && (
              <>
                <AlertCircle
                  className="mx-auto mb-4 h-16 w-16 text-red-500"
                  aria-hidden="true"
                />
                <h2 className="mb-2 text-xl font-semibold text-gray-900">
                  Error de verificación
                </h2>
                <p className="text-gray-600">
                  {verifyMutation.error instanceof Error
                    ? verifyMutation.error.message
                    : 'El enlace de verificación es inválido o ha expirado.'}
                </p>
              </>
            )}
          </CardContent>

          <CardFooter className="justify-center">
            <Link to="/login">
              <Button
                variant={
                  verifyMutation.isSuccess ? 'default' : 'outline'
                }
              >
                Ir al inicio de sesión
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
