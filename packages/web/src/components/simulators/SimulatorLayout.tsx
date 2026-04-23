import type React from 'react';
import { cn } from '../../lib/utils';

interface SimulatorLayoutProps {
  title: string;
  description: string;
  form: React.ReactNode;
  results: React.ReactNode;
  isLoading?: boolean;
}

export default function SimulatorLayout({
  title,
  description,
  form,
  results,
  isLoading = false,
}: SimulatorLayoutProps): React.ReactElement {
  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left column — form (40%) */}
        <div className="w-full lg:w-[40%] lg:flex-shrink-0">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {form}
          </div>
        </div>

        {/* Right column — results (60%) */}
        <div className={cn('w-full lg:flex-1', isLoading && 'opacity-60 pointer-events-none')}>
          {results}
        </div>
      </div>
    </div>
  );
}
