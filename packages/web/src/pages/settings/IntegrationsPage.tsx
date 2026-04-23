import { useState } from 'react';
import type React from 'react';
import { Coins, TrendingUp, Users, BarChart3 } from 'lucide-react';
import IntegrationCard from '../../components/integrations/IntegrationCard';
import BinanceConnectDialog from '../../components/integrations/BinanceConnectDialog';
import DisconnectConfirmDialog from '../../components/integrations/DisconnectConfirmDialog';
import {
  useIntegrations,
  useTriggerSync,
  useDisconnectIntegration,
} from '../../hooks/useIntegrations';
import type { IntegrationProvider } from '../../types/api';

// ─── Provider definitions (static metadata) ──────────────────────────────────

interface ProviderMeta {
  provider: IntegrationProvider | null;
  name: string;
  description: string;
  icon: React.ReactNode;
  comingSoon: boolean;
}

const PROVIDERS: ProviderMeta[] = [
  {
    provider: 'binance',
    name: 'Binance',
    description: 'Sincroniza balances y trades de spot',
    icon: <Coins className="h-5 w-5 text-yellow-500" aria-hidden="true" />,
    comingSoon: false,
  },
  {
    provider: null,
    name: 'DeGiro',
    description: 'Importa tu cartera de acciones y ETFs',
    icon: <TrendingUp className="h-5 w-5 text-blue-500" aria-hidden="true" />,
    comingSoon: true,
  },
  {
    provider: null,
    name: 'eToro',
    description: 'Conecta tu cuenta de social trading',
    icon: <Users className="h-5 w-5 text-green-500" aria-hidden="true" />,
    comingSoon: true,
  },
  {
    provider: null,
    name: 'Interactive Brokers',
    description: 'Integra tu broker de acciones global',
    icon: <BarChart3 className="h-5 w-5 text-indigo-500" aria-hidden="true" />,
    comingSoon: true,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage(): React.ReactElement {
  const [binanceDialogOpen, setBinanceDialogOpen] = useState(false);
  const [disconnectProvider, setDisconnectProvider] = useState<IntegrationProvider | null>(null);

  const { data: integrations, isLoading, isError } = useIntegrations();
  const syncMutation = useTriggerSync();
  const disconnectMutation = useDisconnectIntegration();

  function getStatus(provider: IntegrationProvider | null) {
    if (!provider || !integrations) return undefined;
    return integrations.find((s) => s.provider === provider);
  }

  function handleSync(provider: IntegrationProvider): void {
    syncMutation.mutate(provider);
  }

  function handleDisconnectConfirm(): void {
    if (!disconnectProvider) return;
    disconnectMutation.mutate(disconnectProvider, {
      onSuccess: () => setDisconnectProvider(null),
    });
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integraciones</h1>
        <p className="mt-1 text-sm text-gray-500">
          Conecta tus exchanges y brokers para sincronizar tu portfolio automaticamente.
        </p>
      </div>

      {/* Error state */}
      {isError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo cargar el estado de las integraciones. Recarga la pagina para reintentar.
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div
          className="grid gap-4 sm:grid-cols-2"
          aria-label="Cargando integraciones"
          aria-busy="true"
        >
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-36 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {/* Integration cards grid */}
      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {PROVIDERS.map(({ provider, name, description, icon, comingSoon }) => (
            <IntegrationCard
              key={name}
              name={name}
              description={description}
              icon={icon}
              comingSoon={comingSoon}
              status={provider ? getStatus(provider) : undefined}
              onConnect={
                provider === 'binance' ? () => setBinanceDialogOpen(true) : undefined
              }
              onSync={provider ? () => handleSync(provider) : undefined}
              onDisconnect={provider ? () => setDisconnectProvider(provider) : undefined}
              isSyncPending={
                provider ? syncMutation.isPending && syncMutation.variables === provider : false
              }
              isDisconnectPending={
                provider
                  ? disconnectMutation.isPending && disconnectMutation.variables === provider
                  : false
              }
            />
          ))}
        </div>
      )}

      {/* Binance connect dialog */}
      <BinanceConnectDialog
        open={binanceDialogOpen}
        onOpenChange={setBinanceDialogOpen}
      />

      {/* Disconnect confirm dialog */}
      {disconnectProvider && (
        <DisconnectConfirmDialog
          open={disconnectProvider !== null}
          onOpenChange={(open) => {
            if (!open) setDisconnectProvider(null);
          }}
          provider={disconnectProvider}
          isPending={disconnectMutation.isPending}
          onConfirm={handleDisconnectConfirm}
        />
      )}
    </div>
  );
}
