import type React from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  CreditCard,
  TrendingUp,
  Zap,
  Sunset,
  BookMarked,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useSavedSimulations } from '../../hooks/useSimulators';

interface SimulatorCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  color: string;
  bgColor: string;
}

const SIMULATOR_CARDS: SimulatorCard[] = [
  {
    title: 'Hipoteca',
    description:
      'Calcula la cuota mensual, total de intereses y tabla de amortizacion de tu hipoteca. Soporta hipoteca mixta.',
    icon: <Home className="h-6 w-6" aria-hidden="true" />,
    to: '/simulators/mortgage',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Prestamo personal',
    description:
      'Simula cualquier prestamo personal. Calcula TIN, TAE y el impacto de comisiones de apertura.',
    icon: <CreditCard className="h-6 w-6" aria-hidden="true" />,
    to: '/simulators/loan',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
  {
    title: 'Inversion / Interes compuesto',
    description:
      'Proyecta el crecimiento de tus inversiones con aportaciones periodicas, escenarios y ajuste por inflacion.',
    icon: <TrendingUp className="h-6 w-6" aria-hidden="true" />,
    to: '/simulators/investment',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    title: 'Amortizacion anticipada',
    description:
      'Descubre cuanto ahorras haciendo un pago extra: reduce la cuota o acorta el plazo.',
    icon: <Zap className="h-6 w-6" aria-hidden="true" />,
    to: '/simulators/early-repayment',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    title: 'Planificacion de jubilacion',
    description:
      'Calcula cuanto necesitas ahorrar cada mes para alcanzar la renta mensual que quieres al jubilarte.',
    icon: <Sunset className="h-6 w-6" aria-hidden="true" />,
    to: '/simulators/retirement',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
];

export default function SimulatorsPage(): React.ReactElement {
  const { data: saved } = useSavedSimulations();
  const hasSaved = (saved?.length ?? 0) > 0;

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simuladores financieros</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toma decisiones informadas con nuestras calculadoras financieras avanzadas.
          </p>
        </div>
        {hasSaved && (
          <Link to="/simulators/saved">
            <Button variant="outline" size="sm" className="gap-2">
              <BookMarked className="h-4 w-4" aria-hidden="true" />
              Simulaciones guardadas ({saved?.length})
            </Button>
          </Link>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SIMULATOR_CARDS.map((card) => (
          <div
            key={card.to}
            className="group flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${card.bgColor} ${card.color}`}
            >
              {card.icon}
            </div>
            <h2 className="mb-2 text-base font-semibold text-gray-900">{card.title}</h2>
            <p className="flex-1 text-sm text-gray-500">{card.description}</p>
            <div className="mt-5">
              <Link to={card.to}>
                <Button className="w-full gap-2">
                  Abrir simulador
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Saved simulations link */}
      {hasSaved && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookMarked className="h-5 w-5 text-gray-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Tienes {saved?.length} simulacion{(saved?.length ?? 0) !== 1 ? 'es' : ''} guardada
                  {(saved?.length ?? 0) !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-500">
                  Accede a ellas para retomar tus calculos o descargar PDF.
                </p>
              </div>
            </div>
            <Link to="/simulators/saved">
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
