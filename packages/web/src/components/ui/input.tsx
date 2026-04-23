import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Indicates that the value of the input does not conform to its constraints.
   * When true, visual error styling is applied and assistive technologies
   * will announce the invalid state.
   */
  'aria-invalid'?: React.AriaAttributes['aria-invalid'];
  /**
   * References the id(s) of element(s) that describe the input, such as
   * an error message rendered below the field.
   */
  'aria-describedby'?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
          'placeholder:text-gray-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          ariaInvalid && 'border-red-500 focus-visible:ring-red-500',
          className,
        )}
        aria-invalid={ariaInvalid}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
