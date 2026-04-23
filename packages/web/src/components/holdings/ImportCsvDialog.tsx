import * as React from 'react';
import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { useAccounts } from '../../hooks/useAccounts';
import { useImportCsv } from '../../hooks/useHoldings';
import type { ImportResult } from '../../types/api';
import { cn } from '../../lib/utils';

// ─── CSV preview parser ───────────────────────────────────────────────────────

function parseFirstRows(
  content: string,
  maxRows: number,
): { headers: string[]; rows: string[][] } {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines
    .slice(1, maxRows + 1)
    .map((line) => line.split(',').map((c) => c.trim()));

  return { headers, rows };
}

// ─── Dropzone ─────────────────────────────────────────────────────────────────

interface DropzoneProps {
  onFileSelected: (file: File) => void;
  fileName: string | null;
  onClear: () => void;
}

function Dropzone({ onFileSelected, fileName, onClear }: DropzoneProps): React.ReactElement {
  const [dragging, setDragging] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null): void {
    const file = files?.[0];
    if (file && file.name.endsWith('.csv')) {
      onFileSelected(file);
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((): void => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>): void => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onFileSelected],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !fileName && inputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors',
        'min-h-[120px] cursor-pointer px-6 py-8 text-center',
        dragging
          ? 'border-primary-400 bg-primary-50'
          : fileName
            ? 'border-green-300 bg-green-50 cursor-default'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100',
      )}
      role="button"
      aria-label="Zona de carga de archivo CSV"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !fileName) {
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
        aria-label="Seleccionar archivo CSV"
      />

      {fileName ? (
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-600" aria-hidden="true" />
          <span className="text-sm font-medium text-green-700">{fileName}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="ml-1 rounded p-0.5 text-green-600 hover:bg-green-100"
            aria-label="Eliminar archivo seleccionado"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="mb-3 h-8 w-8 text-gray-400" aria-hidden="true" />
          <p className="text-sm font-medium text-gray-600">
            Arrastra tu CSV aqui o{' '}
            <span className="text-primary-600 underline">haz clic para seleccionar</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">Solo archivos .csv</p>
        </>
      )}
    </div>
  );
}

// ─── CSV preview table ────────────────────────────────────────────────────────

interface CsvPreviewProps {
  headers: string[];
  rows: string[][];
}

function CsvPreview({ headers, rows }: CsvPreviewProps): React.ReactElement {
  if (headers.length === 0) return <></>;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-gray-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-gray-100">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-1.5 text-xs text-gray-400">
        Mostrando las primeras {rows.length} filas del archivo
      </p>
    </div>
  );
}

// ─── Import result ────────────────────────────────────────────────────────────

interface ImportResultViewProps {
  result: ImportResult;
}

function ImportResultView({ result }: ImportResultViewProps): React.ReactElement {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3">
        <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
        <div className="text-sm text-green-700">
          <strong>{result.created}</strong> posiciones creadas,{' '}
          <strong>{result.updated}</strong> actualizadas.
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
            <span className="text-sm font-medium text-red-700">
              {result.errors.length} errores encontrados:
            </span>
          </div>
          <ul className="space-y-1">
            {result.errors.map((err, i) => (
              <li key={i} className="text-xs text-red-600">
                &bull; {err}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportCsvDialog({
  open,
  onOpenChange,
}: ImportCsvDialogProps): React.ReactElement {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const importMutation = useImportCsv();

  const investmentAccounts = accounts.filter(
    (a) => a.isActive && (a.type === 'crypto' || a.type === 'investment'),
  );

  function handleFileSelected(file: File): void {
    setFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e): void => {
      const content = e.target?.result as string;
      setCsvContent(content);
      setPreview(parseFirstRows(content, 3));
    };
    reader.readAsText(file);
  }

  function handleClearFile(): void {
    setFileName(null);
    setCsvContent('');
    setPreview(null);
    setImportResult(null);
  }

  async function handleImport(): Promise<void> {
    if (!selectedAccountId || !csvContent) return;
    const result = await importMutation.mutateAsync({
      accountId: selectedAccountId,
      csvContent,
    });
    setImportResult(result);
  }

  function handleClose(): void {
    handleClearFile();
    setSelectedAccountId('');
    setImportResult(null);
    onOpenChange(false);
  }

  const canImport = selectedAccountId && csvContent && !importMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar desde CSV</DialogTitle>
          <DialogDescription>
            Importa tus posiciones desde DeGiro, eToro u otros brokers en formato CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supported formats info */}
          <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <p className="font-semibold mb-1">Formatos soportados:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>
                <strong>DeGiro</strong> — Exporta desde Cuenta &rsaquo; Historial de posiciones
              </li>
              <li>
                <strong>eToro</strong> — Exporta desde Portafolio &rsaquo; Extracto de cuenta
              </li>
              <li>
                <strong>Generico</strong> — Columnas: symbol, quantity, averageBuyPrice, assetType
              </li>
            </ul>
          </div>

          {/* Account selector */}
          <div className="space-y-1.5">
            <Label htmlFor="import-account">Cuenta destino</Label>
            {accountsLoading ? (
              <Skeleton className="h-10 w-full rounded-md" />
            ) : (
              <Select
                id="import-account"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                <option value="">Selecciona una cuenta</option>
                {investmentAccounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name}
                  </option>
                ))}
              </Select>
            )}
            {!accountsLoading && investmentAccounts.length === 0 && (
              <p className="text-xs text-amber-600">
                No tienes cuentas de tipo Cripto o Inversion. Crea una primero.
              </p>
            )}
          </div>

          {/* Dropzone */}
          <div className="space-y-1.5">
            <Label>Archivo CSV</Label>
            <Dropzone
              onFileSelected={handleFileSelected}
              fileName={fileName}
              onClear={handleClearFile}
            />
          </div>

          {/* Preview */}
          {preview && preview.headers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Vista previa del archivo
              </p>
              <CsvPreview headers={preview.headers} rows={preview.rows} />
            </div>
          )}

          {/* Import result */}
          {importResult && <ImportResultView result={importResult} />}

          {/* Mutation error */}
          {importMutation.error && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
              {importMutation.error.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {importResult ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!importResult && (
            <Button
              type="button"
              onClick={handleImport}
              disabled={!canImport}
            >
              {importMutation.isPending ? 'Importando...' : 'Importar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
