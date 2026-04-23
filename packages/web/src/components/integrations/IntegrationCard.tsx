import type React from 'react';
import { RefreshCw, Unplug, Plug } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { formatDate } from '../../lib/formatters';
import type { IntegrationStatus, SyncStatus } from '../../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntegrationCardProps {
  /** Datos de estado si el proveedor está disponible y conectado */
  status?: IntegrationStatus;
  /** Nombre a mostrar */
  name: string;
  /** Descripción corta */
  description: string;
  /** Icono del proveedor */
  icon: React.ReactNode;
  /** Si es "Próximamente" */
  comingSoon?: boolean;
  /** Callbacks */
  onConnect?: () => void;
  onSync?: () => void;
  onDisconnect?: () => void;
  /** Estado de mutaciones pendientes */
  isSyncPending?: boolean;
  isDisconnectPending?: boolean;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function SyncStatusBadge({ status }: { status: SyncStatus }): React.ReactElement {
  switch (status) {
    case 'success':
      return <Badge variant="success">Conectado</Badge>;
    case 'pending':
      return <Badge variant="warning">Sincronizando...</Badge>;
    case 'error':
      return <Badge variant="destructive">Error</Badge>;
    case 'never':
    default:
      return <Badge variant="outline">Pendiente</Badge>;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntegrationCard({
  status,
  name,
  description,
  icon,
  comingSoon = false,
  onConnect,
  onSync,
  onDisconnect,
  isSyncPending = false,
  isDisconnectPending = false,
}: IntegrationCardProps): React.ReactElement {
  const isConnected = status?.connected ?? false;
  const syncStatus = status?.lastSyncStatus ?? 'never';
  const isPending = syncStatus === 'pending' || isSyncPending;

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          {/* Icon + name */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-2xl border border-gray-100">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
              <p className="text-xs text-gray-500 leading-snug mt-0.5">{description}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex-shrink-0 pt-0.5">
            {comingSoon ? (
              <Badge variant="outline">Próximamente</Badge>
            ) : isConnected ? (
              <SyncStatusBadge status={syncStatus} />
            ) : (
              <Badge variant="outline">Desconectado</Badge>
            )}
          </div>
        </div>

        {/* Connected details */}
        {isConnected && status && (
          <div className="mt-4 space-y-3">
            {/* Last sync info */}
            {status.lastSyncAt ? (
              <p className="text-xs text-gray-500">
                Ultima sincronización:{' '}
                <span className="font-medium text-gray-700">
                  {formatDate(status.lastSyncAt, 'relative')}
                </span>
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">Sin sincronizaciones previas</p>
            )}

            {/* Sync error */}
            {syncStatus === 'error' && status.lastSyncError && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{status.lastSyncError}</AlertDescription>
              </Alert>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={onSync}
                disabled={isPending || isDisconnectPending}
                aria-label={`Sincronizar ${name}`}
              >
                <RefreshCw
                  className={['h-3.5 w-3.5', isPending ? 'animate-spin' : ''].join(' ')}
                  aria-hidden="true"
                />
                {isPending ? 'Sincronizando...' : 'Sincronizar ahora'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDisconnect}
                disabled={isPending || isDisconnectPending}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                aria-label={`Desconectar ${name}`}
              >
                {isDisconnectPending ? (
                  <>
                    <span
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent"
                      aria-hidden="true"
                    />
                    Desconectando...
                  </>
                ) : (
                  <>
                    <Unplug className="h-3.5 w-3.5" aria-hidden="true" />
                    Desconectar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Disconnected — show connect button */}
        {!isConnected && !comingSoon && (
          <div className="mt-4">
            <Button
              size="sm"
              onClick={onConnect}
              className="gap-1.5"
              aria-label={`Conectar ${name}`}
            >
              <Plug className="h-3.5 w-3.5" aria-hidden="true" />
              Conectar
            </Button>
          </div>
        )}

        {/* Coming soon placeholder */}
        {comingSoon && (
          <div className="mt-4">
            <Button size="sm" disabled variant="outline" className="opacity-50">
              Conectar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
