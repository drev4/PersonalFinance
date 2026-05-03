import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import type React from 'react';
import { Tag, Plus, Trash2, Pencil, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../../components/ui/dialog';
import {
  useCategoryRules,
  useCreateCategoryRule,
  useUpdateCategoryRule,
  useDeleteCategoryRule,
} from '../../hooks/useCategoryRules';
import { useCategories } from '../../hooks/useCategories';
import type { CategoryRule } from '../../api/categoryRules.api';
import type { Category } from '../../types/api';

// ─── Keyword tag input ────────────────────────────────────────────────────────

interface KeywordInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

function KeywordInput({ keywords, onChange }: KeywordInputProps): React.ReactElement {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function addKeyword(): void {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed]);
    }
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    } else if (e.key === 'Backspace' && input === '' && keywords.length > 0) {
      onChange(keywords.slice(0, -1));
    }
  }

  function removeKeyword(kw: string): void {
    onChange(keywords.filter((k) => k !== kw));
  }

  return (
    <div
      className="flex min-h-10 flex-wrap gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 cursor-text focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2"
      onClick={() => inputRef.current?.focus()}
    >
      {keywords.map((kw) => (
        <span
          key={kw}
          className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700"
        >
          {kw}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeKeyword(kw); }}
            className="hover:text-primary-900 focus:outline-none"
            aria-label={`Eliminar palabra ${kw}`}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addKeyword}
        placeholder={keywords.length === 0 ? 'Escribe y pulsa Enter...' : ''}
        className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-gray-400"
        aria-label="Añadir palabra clave"
      />
    </div>
  );
}

// ─── Rule form state ──────────────────────────────────────────────────────────

interface RuleFormState {
  categoryId: string;
  keywords: string[];
  priority: string;
}

const emptyForm = (): RuleFormState => ({ categoryId: '', keywords: [], priority: '0' });

// ─── Rule form dialog ─────────────────────────────────────────────────────────

interface RuleFormDialogProps {
  open: boolean;
  rule?: CategoryRule;
  categories: Category[];
  onClose: () => void;
}

function RuleFormDialog({ open, rule, categories, onClose }: RuleFormDialogProps): React.ReactElement {
  const isEditing = !!rule;
  const createMutation = useCreateCategoryRule();
  const updateMutation = useUpdateCategoryRule();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<RuleFormState>(emptyForm);

  useEffect(() => {
    if (open) {
      setForm(
        rule
          ? { categoryId: rule.categoryId, keywords: rule.keywords, priority: String(rule.priority) }
          : emptyForm(),
      );
    }
  }, [open, rule]);

  const isValid = form.categoryId !== '' && form.keywords.length > 0;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!isValid || isPending) return;
    const priority = parseInt(form.priority, 10) || 0;

    if (isEditing && rule) {
      updateMutation.mutate(
        { id: rule._id, data: { categoryId: form.categoryId, keywords: form.keywords, priority } },
        { onSuccess: onClose },
      );
    } else {
      createMutation.mutate(
        { categoryId: form.categoryId, keywords: form.keywords, priority },
        { onSuccess: onClose },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar regla' : 'Nueva regla'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Categoría *
            </label>
            <Select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              required
            >
              <option value="">Selecciona una categoría</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Palabras clave *
            </label>
            <KeywordInput
              keywords={form.keywords}
              onChange={(kws) => setForm((f) => ({ ...f, keywords: kws }))}
            />
            <p className="text-xs text-gray-400">
              Pulsa Enter o coma para añadir. Se comparan con la descripción de las transacciones.
            </p>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Prioridad
            </label>
            <Input
              type="number"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              min={0}
              max={999}
              placeholder="0"
            />
            <p className="text-xs text-gray-400">Mayor número = mayor prioridad al aplicar reglas.</p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear regla'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Rule row ─────────────────────────────────────────────────────────────────

interface RuleRowProps {
  rule: CategoryRule;
  category: Category | undefined;
  onEdit: (rule: CategoryRule) => void;
}

function RuleRow({ rule, category, onEdit }: RuleRowProps): React.ReactElement {
  const updateMutation = useUpdateCategoryRule();
  const deleteMutation = useDeleteCategoryRule();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleToggleActive(): void {
    updateMutation.mutate({ id: rule._id, data: { isActive: !rule.isActive } });
  }

  function handleDelete(): void {
    deleteMutation.mutate(rule._id, { onSuccess: () => setConfirmDelete(false) });
  }

  return (
    <>
      <div className="flex items-start gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        {/* Category dot + name */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: category?.color ?? '#6b7280' }}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-gray-800">
              {category?.name ?? '—'}
            </span>
            <Badge variant="outline" className="ml-auto text-[10px]">
              Prioridad {rule.priority}
            </Badge>
          </div>

          {/* Keywords */}
          <div className="flex flex-wrap gap-1.5">
            {rule.keywords.map((kw) => (
              <Badge key={kw} variant="default">
                {kw}
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-3">
          <Switch
            checked={rule.isActive}
            onCheckedChange={handleToggleActive}
            disabled={updateMutation.isPending}
            aria-label={rule.isActive ? 'Desactivar regla' : 'Activar regla'}
          />
          <button
            type="button"
            onClick={() => onEdit(rule)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Editar regla"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Eliminar regla"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar regla</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            ¿Seguro que quieres eliminar esta regla de categorización? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoryRulesPage(): React.ReactElement {
  const { data: rules, isLoading: rulesLoading } = useCategoryRules();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const isLoading = rulesLoading || categoriesLoading;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CategoryRule | undefined>(undefined);

  function openCreate(): void {
    setEditingRule(undefined);
    setDialogOpen(true);
  }

  function openEdit(rule: CategoryRule): void {
    setEditingRule(rule);
    setDialogOpen(true);
  }

  function handleClose(): void {
    setDialogOpen(false);
    setEditingRule(undefined);
  }

  const categoryMap = new Map<string, Category>(
    (categories ?? []).map((c) => [c._id, c]),
  );

  const activeRules = (rules ?? []).filter((r) => r.isActive);
  const inactiveRules = (rules ?? []).filter((r) => !r.isActive);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
            <Tag className="h-5 w-5 text-primary-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reglas de categorización</h1>
            <p className="text-sm text-gray-500">
              Asigna categorías automáticamente según la descripción de las transacciones.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva regla
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (rules ?? []).length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Tag className="h-10 w-10 text-gray-300" aria-hidden="true" />
            <div>
              <p className="font-medium text-gray-700">Sin reglas configuradas</p>
              <p className="mt-1 text-sm text-gray-400">
                Crea una regla para categorizar transacciones automáticamente.
              </p>
            </div>
            <Button onClick={openCreate} className="mt-2 gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Crear primera regla
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active rules */}
      {!isLoading && activeRules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Activas ({activeRules.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeRules.map((rule) => (
              <RuleRow
                key={rule._id}
                rule={rule}
                category={categoryMap.get(rule.categoryId)}
                onEdit={openEdit}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Inactive rules */}
      {!isLoading && inactiveRules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Inactivas ({inactiveRules.length})
            </CardTitle>
            <CardDescription>Estas reglas no se aplican al importar transacciones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {inactiveRules.map((rule) => (
              <RuleRow
                key={rule._id}
                rule={rule}
                category={categoryMap.get(rule.categoryId)}
                onEdit={openEdit}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Form dialog */}
      <RuleFormDialog
        open={dialogOpen}
        rule={editingRule}
        categories={categories ?? []}
        onClose={handleClose}
      />
    </div>
  );
}
