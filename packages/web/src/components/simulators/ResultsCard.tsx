import type React from 'react';
import { cn } from '../../lib/utils';

interface Metric {
  label: string;
  value: string;
  color?: string;
  description?: string;
}

interface ResultsCardProps {
  metrics: Metric[];
  className?: string;
}

export default function ResultsCard({
  metrics,
  className,
}: ResultsCardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex flex-col gap-1"
          title={metric.description}
        >
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {metric.label}
          </span>
          <span
            className={cn(
              'text-xl font-bold leading-tight',
              metric.color ?? 'text-gray-900',
            )}
          >
            {metric.value}
          </span>
          {metric.description && (
            <span className="text-xs text-gray-400">{metric.description}</span>
          )}
        </div>
      ))}
    </div>
  );
}
