import { useState } from 'react';
import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookMarked, Download, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { useSavedSimulations, useDeleteSimulation } from '../../hooks/useSimulators';
import { downloadSimulationPdf } from '../../api/simulators.api';
import type { SavedSimulation } from '../../types/api';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline'; route: string }
> = {
  mortgage: { label: 'Hipoteca', variant: 'default', route: '/simulators/mortgage' },
  loan: { label: 'Prestamo', variant: 'warning', route: '/simulators/loan' },
  investment: { label: 'Inversion', variant: 'success', route: '/simulators/investment' },
  'early-repayment': { label: 'Amortizacion', variant: 'outline', route: '/simulators/early-repayment' },
  retirement: { label: 'Jubilacion', variant: 'destructive', route: '/simulators/retirement' },
};

const TAB_TYPES = ['all', 'mortgage', 'loan', 'investment', 'early-repayment', 'retirement'];
const TAB_LABELS: Record<string, string> = {
  all: 'Todas',
  mortgage: 'Hipoteca',
  loan: 'Prestamo',
  investment: 'Inversion',
  'early-repayment': 'Amortizacion',
  retirement: 'Jubilacion',
};

// ─── Components ───────────────────────────────────────────────────────────────

function EmptyState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
      <BookMarked className="mx-auto mb-3 h-10 w-10 text-gray-300" aria-hidden="true" />
      <p className="text-sm font-medium text-gray-500">No hay simulaciones guardadas</p>
      <p className="mt-1 text-xs text-gray-400">
        Abre un simulador y guarda tu calculo para verlo aqui.
      </p>
      <Link to="/simulators" className="mt-4">
        <Button variant="outline" size="sm">
          Ir a simuladores
        </Button>
      </Link>
    </div>
  );
}

interface SimulationCardProps {
  simulation: SavedSimulation;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function SimulationCard({
  simulation,
  onDelete,
  isDeleting,
}: SimulationCardProps): React.ReactElement {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[simulation.type] ?? {
    label: simulation.type,
    variant: 'outline' as const,
    route: '/simulators',
  };

  const createdAt = (() => {
    try {
      return format(parseISO(simulation.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return simulation.createdAt;
    }
  })();

  async function handleDownload(): Promise<void> {
    try {
      const blob = await downloadSimulationPdf(simulation._id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${simulation.name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // handle silently
    }
  }

  function handleOpen(): void {
    navigate(config.route, { state: { savedInputs: simulation.inputs } });
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
        <p className="truncate text-sm font-semibold text-gray-900">{simulation.name}</p>
        <p className="mt-0.5 text-xs text-gray-400">Guardada el {createdAt}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          className="gap-1 text-xs"
          title="Abrir en simulador"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          Abrir
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="gap-1 text-xs"
          title="Descargar PDF"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          PDF
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(simulation._id)}
          disabled={isDeleting}
          className="gap-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {isDeleting ? '...' : 'Eliminar'}
        </Button>
      </div>
    </div>
  );
}

interface SimulationListProps {
  simulations: SavedSimulation[];
  onDelete: (id: string) => void;
  deletingId: string | null;
}

function SimulationList({
  simulations,
  onDelete,
  deletingId,
}: SimulationListProps): React.ReactElement {
  if (simulations.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-3">
      {simulations.map((sim) => (
        <SimulationCard
          key={sim._id}
          simulation={sim}
          onDelete={onDelete}
          isDeleting={deletingId === sim._id}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SavedSimulationsPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: simulations = [], isLoading } = useSavedSimulations();
  const deleteMutation = useDeleteSimulation();

  function handleDelete(id: string): void {
    setDeletingId(id);
    deleteMutation.mutate(id, {
      onSettled: () => {
        setDeletingId(null);
      },
    });
  }

  function getFilteredSimulations(type: string): SavedSimulation[] {
    if (type === 'all') return simulations;
    return simulations.filter((s) => s.type === type);
  }

  function getCount(type: string): number {
    return getFilteredSimulations(type).length;
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulaciones guardadas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Accede a tus calculos guardados, abrelos o descarga el PDF.
          </p>
        </div>
        <Link to="/simulators">
          <Button variant="outline" size="sm">
            Volver a simuladores
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-1 flex-wrap gap-1">
            {TAB_TYPES.map((type) => {
              const count = getCount(type);
              return (
                <TabsTrigger key={type} value={type}>
                  {TAB_LABELS[type]}
                  {count > 0 && (
                    <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TAB_TYPES.map((type) => (
            <TabsContent key={type} value={type}>
              <SimulationList
                simulations={getFilteredSimulations(type)}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
