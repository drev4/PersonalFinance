import * as React from 'react';
import { cn } from '../../lib/utils';

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      aria-hidden="true"
      {...props}
    />
  ),
);
Skeleton.displayName = 'Skeleton';

/**
 * Wraps skeleton placeholders with the correct ARIA attributes so assistive
 * technologies announce the loading state to users.
 *
 * Usage:
 *   <SkeletonContainer label="Cargando transacciones">
 *     <Skeleton className="h-8 w-full" />
 *     <Skeleton className="h-8 w-3/4" />
 *   </SkeletonContainer>
 */
interface SkeletonContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

const SkeletonContainer = React.forwardRef<HTMLDivElement, SkeletonContainerProps>(
  ({ className, label = 'Cargando', children, ...props }, ref) => (
    <div
      ref={ref}
      aria-label={label}
      aria-busy="true"
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  ),
);
SkeletonContainer.displayName = 'SkeletonContainer';

export { Skeleton, SkeletonContainer };
