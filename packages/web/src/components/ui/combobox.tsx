import * as React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from './skeleton';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  onSearch: (query: string) => void;
  options: ComboboxOption[];
  isLoading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

// Debounce hook internal to this component
function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function Combobox({
  value,
  onValueChange,
  onSearch,
  options,
  isLoading = false,
  placeholder = 'Buscar...',
  emptyMessage = 'Sin resultados.',
  className,
  disabled = false,
}: ComboboxProps): React.ReactElement {
  const [inputValue, setInputValue] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const debouncedInput = useDebounce(inputValue, 300);

  // Propagate debounced search term to parent
  React.useEffect(() => {
    onSearch(debouncedInput);
  }, [debouncedInput, onSearch]);

  // Find the label for the currently selected value
  const selectedOption = options.find((o) => o.value === value);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleOutsideClick(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function handleTriggerClick(): void {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        // Reset input when opening
        setInputValue('');
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      return next;
    });
  }

  function handleSelect(option: ComboboxOption): void {
    onValueChange(option.value);
    setInputValue('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showEmpty = !isLoading && options.length === 0 && debouncedInput.length >= 2;
  const showPrompt = !isLoading && options.length === 0 && debouncedInput.length < 2;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleTriggerClick}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selectedOption && 'text-gray-400',
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg',
            'max-h-64 overflow-hidden flex flex-col',
          )}
        >
          {/* Search input */}
          <div className="flex items-center border-b border-gray-100 px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe para buscar..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              aria-label="Buscar opcion"
            />
          </div>

          {/* Results */}
          <ul
            role="listbox"
            className="overflow-y-auto"
            aria-label="Opciones disponibles"
          >
            {/* Loading skeletons */}
            {isLoading && (
              <li className="space-y-2 p-3" aria-label="Cargando resultados">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-2/3" />
              </li>
            )}

            {/* Empty prompt */}
            {showPrompt && (
              <li className="px-3 py-4 text-center text-xs text-gray-400">
                Escribe al menos 2 caracteres para buscar
              </li>
            )}

            {/* No results */}
            {showEmpty && (
              <li className="px-3 py-4 text-center text-xs text-gray-400">
                {emptyMessage}
              </li>
            )}

            {/* Options */}
            {!isLoading &&
              options.map((option) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'flex cursor-pointer flex-col px-3 py-2.5 text-sm transition-colors',
                    'hover:bg-gray-50 focus:bg-gray-50 outline-none',
                    option.value === value && 'bg-primary-50 text-primary-700',
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  {option.sublabel && (
                    <span className="text-xs text-gray-400">{option.sublabel}</span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
