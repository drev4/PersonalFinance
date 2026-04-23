import type React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import type { IntegrationProvider } from '../../types/api';

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  binance: 'Binance',
  coinmarketcap: 'CoinMarketCap',
  finnhub: 'Finnhub',
};

interface DisconnectConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: IntegrationProvider;
  isPending: boolean;
  onConfirm: () => void;
}

export default function DisconnectConfirmDialog({
  open,
  onOpenChange,
  provider,
  isPending,
  onConfirm,
}: DisconnectConfirmDialogProps): React.ReactElement {
  const providerLabel = PROVIDER_LABELS[provider];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <DialogTitle>¿Desconectar {providerLabel}?</DialogTitle>
          <DialogDescription>
            Se eliminarán las credenciales almacenadas. Tus holdings y transacciones importadas
            se conservarán.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Desconectando...
              </>
            ) : (
              'Desconectar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
