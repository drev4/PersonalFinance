import * as React from 'react';
import { cn } from '../../lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, className, indicatorClassName }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn('relative w-full overflow-hidden rounded-full bg-gray-200', className)}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-in-out',
            indicatorClassName ?? 'bg-primary-600',
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = 'Progress';

export { Progress };
