import { useState } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useSaveSimulation } from '../../hooks/useSimulators';

interface SaveSimulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: string;
  inputs: unknown;
}

export default function SaveSimulationDialog({
  open,
  onOpenChange,
  type,
  inputs,
}: SaveSimulationDialogProps): React.ReactElement {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const saveMutation = useSaveSimulation();

  function handleSave(): void {
    if (!name.trim()) return;
    saveMutation.mutate(
      { type, name: name.trim(), inputs },
      {
        onSuccess: () => {
          setSaved(true);
        },
      },
    );
  }

  function handleOpenChange(next: boolean): void {
    if (!next) {
      setName('');
      setSaved(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {saved ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold text-gray-900">Simulacion guardada</p>
              <p className="mt-1 text-sm text-gray-500">
                Puedes acceder a ella en cualquier momento.
              </p>
            </div>
            <Link
              to="/simulators/saved"
              className="text-sm font-medium text-primary-600 underline-offset-4 hover:underline"
              onClick={() => handleOpenChange(false)}
            >
              Ver simulaciones guardadas
            </Link>
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Guardar simulacion</DialogTitle>
              <DialogDescription>
                Dale un nombre para identificarla facilmente mas adelante.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <label
                htmlFor="sim-name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Nombre de la simulacion
              </label>
              <Input
                id="sim-name"
                placeholder="Ej. Hipoteca piso Madrid 2025"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={saveMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>

            {saveMutation.isError && (
              <p className="mt-2 text-xs text-red-600">
                Error al guardar. Por favor intenta de nuevo.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
