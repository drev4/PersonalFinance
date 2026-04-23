import * as React from 'react';

/**
 * Keyboard-accessible skip-to-content link.
 * Visually hidden until focused, then appears as a fixed overlay.
 * The target element must have id="main-content".
 */
export function SkipLink(): React.ReactElement {
  return (
    <a
      href="#main-content"
      className={[
        'sr-only',
        'focus:not-sr-only',
        'focus:fixed',
        'focus:top-4',
        'focus:left-4',
        'focus:z-50',
        'focus:rounded',
        'focus:bg-white',
        'focus:px-4',
        'focus:py-2',
        'focus:text-sm',
        'focus:font-medium',
        'focus:text-primary-700',
        'focus:shadow-lg',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-primary-500',
      ].join(' ')}
    >
      Saltar al contenido principal
    </a>
  );
}
