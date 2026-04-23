import type React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Home } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function NotFoundPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
        <TrendingUp className="h-8 w-8 text-white" aria-hidden="true" />
      </div>

      <h1 className="mb-2 text-7xl font-extrabold text-primary-600" aria-label="Error 404">
        404
      </h1>
      <h2 className="mb-4 text-2xl font-semibold text-gray-900">
        Pagina no encontrada
      </h2>
      <p className="mb-8 max-w-sm text-gray-500">
        La pagina que buscas no existe o ha sido movida. Verifica la URL o regresa al
        inicio.
      </p>

      <Link to="/">
        <Button className="gap-2">
          <Home className="h-4 w-4" aria-hidden="true" />
          Volver al inicio
        </Button>
      </Link>
    </div>
  );
}
