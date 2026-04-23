import type React from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

function isChunkLoadError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed') ||
      error.name === 'ChunkLoadError'
    );
  }
  return false;
}

export function RouteErrorBoundary(): React.ReactElement {
  const error = useRouteError();

  // Chunk / lazy-load failure — stale deployment or network blip
  if (isChunkLoadError(error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error de carga</h1>
          <p className="text-gray-600 mb-6">
            No se pudo cargar la página. Puede que haya una versión nueva disponible.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // React Router 404 — resource not found via loader/action
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <p className="text-5xl font-extrabold text-primary-600 mb-4">404</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
          <p className="text-gray-600 mb-6">
            La página que buscas no existe o fue movida.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Ir al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Generic route or loader/action error
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Ha ocurrido un error</h1>
        <p className="text-gray-600 mb-6">
          {isRouteErrorResponse(error)
            ? error.statusText
            : error instanceof Error
              ? error.message
              : 'Error desconocido'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Recargar
        </button>
      </div>
    </div>
  );
}
