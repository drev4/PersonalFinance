import { useState, useEffect } from 'react';
import type React from 'react';
import { Tag, Plus, Trash2, Pencil, ChevronRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select } from '../../components/ui/select';
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
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../hooks/useCategories';
import type { Category, CreateCategoryDTO } from '../../types/api';

// The GET /categories API returns a tree with nested children
interface CategoryNode extends Category {
  children?: CategoryNode[];
}

// ─── Preset colors ────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#0052CC', '#00C896', '#FF4757', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#10B981', '#EF4444', '#6366F1', '#84CC16',
];

// ─── Category form dialog ─────────────────────────────────────────────────────

interface CategoryFormState {
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  parentId: string;
}

const emptyForm = (type: 'income' | 'expense' = 'expense'): CategoryFormState => ({
  name: '',
  type,
  color: PRESET_COLORS[0],
  icon: '📦',
  parentId: '',
});

interface CategoryFormDialogProps {
  open: boolean;
  category?: Category;
  parentCategory?: Category;
  allCategories: Category[];
  defaultType?: 'income' | 'expense';
  onClose: () => void;
}

function CategoryFormDialog({
  open,
  category,
  parentCategory,
  allCategories,
  defaultType = 'expense',
  onClose,
}: CategoryFormDialogProps): React.ReactElement {
  const isEditing = !!category;
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const [apiError, setApiError] = useState<string | null>(null);

  const [form, setForm] = useState<CategoryFormState>(emptyForm(defaultType));

  useEffect(() => {
    if (open) {
      setApiError(null);
      if (category) {
        setForm({
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
          parentId: category.parentId ?? '',
        });
      } else {
        setForm({
          ...emptyForm(defaultType),
          parentId: parentCategory?._id ?? '',
          type: parentCategory?.type ?? defaultType,
        });
      }
    }
  }, [open, category, parentCategory, defaultType]);

  const isValid = form.name.trim().length > 0 && form.color.match(/^#[0-9a-fA-F]{6}$/) && form.icon.trim().length > 0;

  // Root categories for parent selector (exclude current and its descendants)
  const rootCategories = allCategories.filter(
    (c) => !c.parentId && c._id !== category?._id && c.type === form.type,
  );

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!isValid || isPending) return;
    setApiError(null);

    const payload: CreateCategoryDTO = {
      name: form.name.trim(),
      type: form.type,
      color: form.color,
      icon: form.icon.trim(),
      parentId: form.parentId || undefined,
    };

    if (isEditing && category) {
      updateMutation.mutate(
        { id: category._id, data: payload },
        {
          onSuccess: onClose,
          onError: () => setApiError('No se pudo guardar la categoría'),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: onClose,
        onError: () => setApiError('No se pudo crear la categoría'),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar categoría' : parentCategory ? `Nueva subcategoría de "${parentCategory.name}"` : 'Nueva categoría'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Nombre *
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Alimentación"
              autoFocus
            />
          </div>

          {/* Type — only editable if creating a root category */}
          {!isEditing && !parentCategory && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tipo *
              </label>
              <Select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'income' | 'expense', parentId: '' }))}
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </Select>
            </div>
          )}

          {/* Parent — only for new subcategory or editing a child */}
          {(isEditing ? !!category.parentId : !parentCategory) && rootCategories.length > 0 && !parentCategory && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Categoría padre (opcional)
              </label>
              <Select
                value={form.parentId}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              >
                <option value="">Sin categoría padre</option>
                {rootCategories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Icon */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Icono * <span className="normal-case font-normal text-gray-400">(emoji)</span>
            </label>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xl"
                style={{ backgroundColor: form.color + '22' }}
              >
                {form.icon || '?'}
              </div>
              <Input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="🍕"
                className="flex-1"
                maxLength={4}
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  style={{
                    backgroundColor: c,
                    outline: form.color === c ? `3px solid ${c}` : undefined,
                    outlineOffset: '2px',
                    transform: form.color === c ? 'scale(1.2)' : undefined,
                  }}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  aria-label={`Color ${c}`}
                  aria-pressed={form.color === c}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-7 w-7 cursor-pointer rounded-full border-0 p-0"
                title="Color personalizado"
              />
            </div>
          </div>

          {apiError && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {apiError}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

interface DeleteDialogProps {
  open: boolean;
  category: Category | null;
  onClose: () => void;
}

function DeleteDialog({ open, category, onClose }: DeleteDialogProps): React.ReactElement {
  const deleteMutation = useDeleteCategory();
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setApiError(null);
  }, [open]);

  function handleDelete(): void {
    if (!category) return;
    deleteMutation.mutate(category._id, {
      onSuccess: onClose,
      onError: (err: Error) => {
        const msg = err.message.includes('transaction')
          ? 'No se puede eliminar: tiene transacciones asociadas.'
          : 'No se pudo eliminar la categoría.';
        setApiError(msg);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar categoría</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          ¿Seguro que quieres eliminar <strong>{category?.name}</strong>? Las subcategorías también serán eliminadas.
        </p>
        {apiError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {apiError}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Category row ─────────────────────────────────────────────────────────────

interface CategoryRowProps {
  category: CategoryNode;
  allCategories: Category[];
  depth: number;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onAddChild: (parent: Category) => void;
}

function CategoryRow({
  category,
  allCategories,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: CategoryRowProps): React.ReactElement {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (category.children?.length ?? 0) > 0;

  return (
    <div>
      <div
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 group"
        style={{ paddingLeft: depth > 0 ? `${depth * 20 + 12}px` : '12px' }}
      >
        {/* Expand toggle */}
        <button
          type="button"
          className={`flex-shrink-0 text-gray-400 transition-transform ${hasChildren ? 'hover:text-gray-600' : 'invisible'}`}
          style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Contraer' : 'Expandir'}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Icon + color dot */}
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-base"
          style={{ backgroundColor: category.color + '22' }}
        >
          <span style={{ color: category.color }}>{category.icon}</span>
        </div>

        {/* Name */}
        <span className="flex-1 text-sm font-medium text-gray-800">{category.name}</span>

        {/* Default badge */}
        {category.isDefault && (
          <Badge variant="outline" className="text-[10px]">Por defecto</Badge>
        )}

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!category.parentId && (
            <button
              type="button"
              onClick={() => onAddChild(category)}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              title="Añadir subcategoría"
              aria-label="Añadir subcategoría"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Editar categoría"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {!category.isDefault && (
            <button
              type="button"
              onClick={() => onDelete(category)}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Eliminar categoría"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {(category.children ?? []).map((child) => (
            <CategoryRow
              key={child._id}
              category={child}
              allCategories={allCategories}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  type: 'income' | 'expense';
  roots: CategoryNode[];
  allCategories: Category[];
  onNew: (type: 'income' | 'expense') => void;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onAddChild: (parent: Category) => void;
}

function Section({
  title,
  type,
  roots,
  allCategories,
  onNew,
  onEdit,
  onDelete,
  onAddChild,
}: SectionProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {title} ({roots.reduce((acc, r) => acc + 1 + (r.children?.length ?? 0), 0)})
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => onNew(type)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Nueva
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {roots.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Sin categorías de {title.toLowerCase()}</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {roots.map((cat) => (
              <CategoryRow
                key={cat._id}
                category={cat}
                allCategories={allCategories}
                depth={0}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddChild={onAddChild}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage(): React.ReactElement {
  const { data: rawCategories, isLoading } = useCategories();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [parentCategory, setParentCategory] = useState<Category | undefined>(undefined);
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>('expense');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // The API returns a tree; cast to CategoryNode[]
  const treeCategories = (rawCategories as CategoryNode[] | undefined) ?? [];

  // Flat list for parent selectors
  const flatCategories: Category[] = [];
  function flatten(nodes: CategoryNode[]): void {
    for (const n of nodes) {
      flatCategories.push(n);
      if (n.children) flatten(n.children);
    }
  }
  flatten(treeCategories);

  const incomeRoots = treeCategories.filter((c) => c.type === 'income');
  const expenseRoots = treeCategories.filter((c) => c.type === 'expense');

  function openCreate(type: 'income' | 'expense'): void {
    setEditingCategory(undefined);
    setParentCategory(undefined);
    setDefaultType(type);
    setFormOpen(true);
  }

  function openAddChild(parent: Category): void {
    setEditingCategory(undefined);
    setParentCategory(parent);
    setDefaultType(parent.type);
    setFormOpen(true);
  }

  function openEdit(cat: Category): void {
    setEditingCategory(cat);
    setParentCategory(undefined);
    setDefaultType(cat.type);
    setFormOpen(true);
  }

  function openDelete(cat: Category): void {
    setDeletingCategory(cat);
    setDeleteOpen(true);
  }

  function closeForm(): void {
    setFormOpen(false);
    setEditingCategory(undefined);
    setParentCategory(undefined);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
          <Tag className="h-5 w-5 text-primary-600" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500">
            Organiza tus transacciones con categorías personalizadas.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {/* Sections */}
      {!isLoading && (
        <>
          <Section
            title="Gastos"
            type="expense"
            roots={expenseRoots}
            allCategories={flatCategories}
            onNew={openCreate}
            onEdit={openEdit}
            onDelete={openDelete}
            onAddChild={openAddChild}
          />
          <Section
            title="Ingresos"
            type="income"
            roots={incomeRoots}
            allCategories={flatCategories}
            onNew={openCreate}
            onEdit={openEdit}
            onDelete={openDelete}
            onAddChild={openAddChild}
          />
        </>
      )}

      {/* Form dialog */}
      <CategoryFormDialog
        open={formOpen}
        category={editingCategory}
        parentCategory={parentCategory}
        allCategories={flatCategories}
        defaultType={defaultType}
        onClose={closeForm}
      />

      {/* Delete dialog */}
      <DeleteDialog
        open={deleteOpen}
        category={deletingCategory}
        onClose={() => { setDeleteOpen(false); setDeletingCategory(null); }}
      />
    </div>
  );
}
