import type React from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps): React.ReactElement {
  return (
    <div className={cn('relative inline-flex group', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2',
          'whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg',
          'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
        )}
      >
        {content}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </div>
  );
}
