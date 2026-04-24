/**
 * Quick-add transaction form validation schemas.
 *
 * Mobile-only form-level schemas for the Quick Add sheet.
 * Uses Zod v4 — compatible with @hookform/resolvers v5.
 */

import { z } from 'zod';

// ─── Transaction type ─────────────────────────────────────────────────────────

export const transactionTypeSchema = z.enum(['expense', 'income', 'transfer']);

export type TransactionFormType = z.infer<typeof transactionTypeSchema>;

// ─── Quick-add form schema ─────────────────────────────────────────────────────

export const quickAddSchema = z.object({
  type: transactionTypeSchema,

  /** Numeric amount in major currency units (e.g. 12.50 for €12,50) */
  amount: z
    .number({ error: 'Introduce un monto válido' })
    .positive('El monto debe ser mayor que 0'),

  /** Account objectId */
  accountId: z
    .string()
    .min(1, 'Selecciona una cuenta'),

  /** Category id — required for expense/income, optional for transfer */
  categoryId: z
    .string()
    .optional(),

  /** ISO 8601 date string */
  date: z
    .string()
    .min(1, 'La fecha es requerida')
    .refine((d) => !isNaN(Date.parse(d)), 'Fecha inválida'),

  /** Optional free-text note */
  note: z
    .string()
    .max(255, 'La nota no puede superar 255 caracteres')
    .optional(),
});

export type QuickAddFormData = z.infer<typeof quickAddSchema>;

// ─── API payload ───────────────────────────────────────────────────────────────

/** Shape sent to POST /transactions */
export interface CreateTransactionPayload {
  type: TransactionFormType;
  amount: number;
  accountId: string;
  categoryId?: string;
  date: string;
  note?: string;
  /** Client-generated temporary id for optimistic updates */
  clientId: string;
}

// ─── Edit transaction schema ───────────────────────────────────────────────────

export const editTransactionSchema = quickAddSchema.extend({
  /** Full ISO 8601 with time */
  date: z
    .string()
    .min(1, 'La fecha es requerida')
    .refine((d) => !isNaN(Date.parse(d)), 'Fecha inválida'),
});

export type EditTransactionFormData = z.infer<typeof editTransactionSchema>;

// ─── API payload for PATCH /transactions/:id ──────────────────────────────────

export interface UpdateTransactionPayload {
  type?: TransactionFormType;
  amount?: number;
  accountId?: string;
  categoryId?: string;
  date?: string;
  note?: string;
}

// ─── Full transaction shape returned by API ───────────────────────────────────

export interface Transaction {
  id: string;
  type: TransactionFormType;
  amount: number;
  currency: string;
  accountId: string;
  accountName?: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  date: string;
  note?: string;
  attachments?: string[];
  status?: 'confirmed' | 'pending';
  _clientId?: string;
}
