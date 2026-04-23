/**
 * quick-add.tsx — Quick Add Transaction Sheet (Fase 3)
 *
 * A full-screen modal (85% height) presented as a bottom sheet.
 * Opened from the FAB via router.push('/(modals)/quick-add').
 *
 * Steps rendered in a single scroll:
 *   1. Transaction type selector (Gasto / Ingreso / Transferencia)
 *   2. Amount input with real-time euro formatting
 *   3. Account chips (frequency-ordered, last-used pre-selected)
 *   4. Category chips (filtered by type, frequency-ordered)
 *   5. Date selector (Hoy / Otra fecha)
 *   6. Note input with category suggestion
 *   7. Quick templates shortcut row
 *   8. Save button
 *
 * Offline-first: useCreateTransaction handles optimistic updates and
 * offline queue persistence. Status "pending" transactions appear in
 * the home list immediately.
 *
 * Validation: react-hook-form + Zod via @hookform/resolvers.
 */

import { DEFAULT_CATEGORIES } from '@finanzas/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateTransaction } from '@/api/hooks/useCreateTransaction';
import { useDashboardSummary } from '@/api/hooks/useDashboardSummary';
import type { AccountChipItem } from '@/components/quick-add/AccountChips';
import { AccountChips } from '@/components/quick-add/AccountChips';
import { AmountInput } from '@/components/quick-add/AmountInput';
import type { CategoryChipItem } from '@/components/quick-add/CategoryChips';
import { CategoryChips } from '@/components/quick-add/CategoryChips';
import { DateSelector } from '@/components/quick-add/DateSelector';
import { NoteInput } from '@/components/quick-add/NoteInput';
import { SaveButton } from '@/components/quick-add/SaveButton';
import { TransactionTypeSelector } from '@/components/quick-add/TransactionTypeSelector';
import type { QuickTemplate } from '@/components/QuickAddTemplates';
import { QuickAddTemplates } from '@/components/QuickAddTemplates';
import { formatCurrency } from '@/lib/formatters';
import {
  quickAddSchema,
  type QuickAddFormData,
  type TransactionFormType,
} from '@/schemas/transaction.schemas';

// ─── Static category list ─────────────────────────────────────────────────────

const STATIC_CATEGORIES: CategoryChipItem[] = DEFAULT_CATEGORIES.map(
  (c, idx) => ({
    id: `cat_${idx}_${c.name.toLowerCase().replace(/\s/g, '_')}`,
    name: c.name,
    color: c.color,
    type: c.type === 'income' ? 'income' : 'expense',
  }),
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAccountChips(
  accounts: Array<{
    id: string;
    name: string;
    balance: number;
    currency: string;
    color?: string;
    type: string;
  }>,
): AccountChipItem[] {
  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    currency: a.currency,
    balance: a.balance,
  }));
}

/** Toast-style floating snackbar */
function Snackbar({
  message,
  visible,
}: {
  message: string;
  visible: boolean;
}): React.JSX.Element | null {
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.snackbar}>
      <Text style={styles.snackbarText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuickAddScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { data: dashboard } = useDashboardSummary();
  const { createTransaction, isPending } = useCreateTransaction();

  // ── Toast state ─────────────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // ── Category suggestion from note ────────────────────────────────────────
  const [categorySuggestion, setCategorySuggestion] = useState<string | null>(null);

  // ── Amount raw string (digit-only, cents) ────────────────────────────────
  const [amountRaw, setAmountRaw] = useState('');

  // ── Date state ───────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ── Form ─────────────────────────────────────────────────────────────────
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuickAddFormData>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      type: 'expense',
      amount: 0,
      accountId: '',
      categoryId: undefined,
      date: new Date().toISOString(),
      note: '',
    },
  });

  const selectedType: TransactionFormType = watch('type');
  const selectedAccountId = watch('accountId');

  // ── Derived data from dashboard ──────────────────────────────────────────

  const accountChips = useMemo(
    () => buildAccountChips(dashboard?.accounts ?? []),
    [dashboard?.accounts],
  );

  const categoryChips = useMemo((): CategoryChipItem[] => {
    if (categorySuggestion) {
      const idx = STATIC_CATEGORIES.findIndex(
        (c) => c.name.toLowerCase() === categorySuggestion.toLowerCase(),
      );
      if (idx > 0) {
        const suggested = STATIC_CATEGORIES[idx];
        if (suggested) {
          const rest = STATIC_CATEGORIES.filter((_, i) => i !== idx);
          return [suggested, ...rest];
        }
      }
    }
    return STATIC_CATEGORIES;
  }, [categorySuggestion]);

  // ── Pre-select first account on mount ────────────────────────────────────
  useEffect(() => {
    const first = accountChips[0];
    if (first && !selectedAccountId) {
      setValue('accountId', first.id);
    }
  }, [accountChips, selectedAccountId, setValue]);

  // ── Sync date to form ─────────────────────────────────────────────────────
  useEffect(() => {
    setValue('date', selectedDate.toISOString());
  }, [selectedDate, setValue]);

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  // ── Template pre-fill ────────────────────────────────────────────────────
  const handleTemplateSelect = useCallback(
    (template: QuickTemplate) => {
      setValue('type', template.type);
      setValue('note', template.note);
      setAmountRaw('');
      setValue('amount', 0);

      const match = categoryChips.find(
        (c) => c.name.toLowerCase() === template.categoryName.toLowerCase(),
      );
      if (match) {
        setValue('categoryId', match.id);
      }
    },
    [setValue, categoryChips],
  );

  // ── Amount change ─────────────────────────────────────────────────────────
  const handleAmountChange = useCallback(
    (raw: string, parsed: number) => {
      setAmountRaw(raw);
      setValue('amount', parsed, { shouldValidate: true });
    },
    [setValue],
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = useCallback(
    async (data: QuickAddFormData) => {
      try {
        const result = await createTransaction({
          type: data.type,
          amount: data.amount,
          accountId: data.accountId,
          categoryId: data.categoryId ?? undefined,
          date: data.date,
          note: data.note ?? undefined,
        });

        if (result.confirmed) {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          const label = formatCurrency(data.amount, 'EUR');
          const typeLabel =
            data.type === 'expense'
              ? 'Gasto'
              : data.type === 'income'
              ? 'Ingreso'
              : 'Transferencia';
          showToast(`${typeLabel} de ${label} guardado`);
        } else {
          // Offline — queued
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning,
          );
          showToast('Sin conexión. Se sincronizará automáticamente.');
        }

        setTimeout(() => router.back(), 600);
      } catch (err) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        );
        const message =
          err instanceof Error ? err.message : 'Error al guardar la transacción';
        Alert.alert('Error', message, [{ text: 'Reintentar', onPress: () => void handleSubmit(onSubmit)() }]);
      }
    },
    [createTransaction, showToast, handleSubmit],
  );

  // ── Validation errors: surface first error ────────────────────────────────
  const firstError = Object.values(errors)[0]?.message;

  return (
    <Animated.View
      style={[styles.container, { paddingBottom: insets.bottom }]}
      entering={SlideInDown.springify().damping(18).stiffness(180)}
    >
      {/* Drag handle */}
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nueva transacción</Text>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Cerrar formulario"
        >
          <Text style={styles.closeText}>Cancelar</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Step 1: Type selector ─────────────────────────────────── */}
          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <TransactionTypeSelector
                selected={value}
                onChange={onChange}
              />
            )}
          />

          {/* ── Step 2: Amount ────────────────────────────────────────── */}
          <AmountInput
            value={amountRaw}
            onChange={handleAmountChange}
            currency="EUR"
            autoFocus
          />
          {errors.amount ? (
            <Text style={styles.fieldError}>{errors.amount.message}</Text>
          ) : null}

          {/* ── Step 3: Account ───────────────────────────────────────── */}
          <Controller
            control={control}
            name="accountId"
            render={({ field: { value, onChange } }) => (
              <AccountChips
                accounts={accountChips}
                selectedId={value}
                onSelect={onChange}
              />
            )}
          />
          {errors.accountId ? (
            <Text style={styles.fieldError}>{errors.accountId.message}</Text>
          ) : null}

          {/* ── Step 4: Category ──────────────────────────────────────── */}
          <Controller
            control={control}
            name="categoryId"
            render={({ field: { value, onChange } }) => (
              <CategoryChips
                categories={categoryChips}
                selectedId={value ?? null}
                onSelect={onChange}
                transactionType={selectedType}
                suggestedName={categorySuggestion}
              />
            )}
          />

          {/* ── Step 5: Date ──────────────────────────────────────────── */}
          <DateSelector
            value={selectedDate}
            onChange={setSelectedDate}
          />

          {/* ── Step 6: Note ──────────────────────────────────────────── */}
          <Controller
            control={control}
            name="note"
            render={({ field: { value, onChange } }) => (
              <NoteInput
                value={value ?? ''}
                onChange={onChange}
                onSuggestion={setCategorySuggestion}
              />
            )}
          />
          {errors.note ? (
            <Text style={styles.fieldError}>{errors.note.message}</Text>
          ) : null}

          {/* ── Step 7: Quick templates ───────────────────────────────── */}
          <View style={styles.templatesSeparator} />
          <QuickAddTemplates onSelect={handleTemplateSelect} />

          {/* ── Validation error banner ───────────────────────────────── */}
          {firstError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{firstError}</Text>
            </View>
          ) : null}

          {/* ── Step 8: Save ──────────────────────────────────────────── */}
          <SaveButton
            onPress={() => void handleSubmit(onSubmit)()}
            isPending={isPending}
            disabled={isPending}
            label={
              selectedType === 'expense'
                ? 'Guardar gasto'
                : selectedType === 'income'
                ? 'Guardar ingreso'
                : 'Guardar transferencia'
            }
          />

          {/* Offline hint */}
          <Text style={styles.offlineHint}>
            Sin conexión: se guardará y sincronizará al volver online
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast */}
      <Snackbar message={toastMessage} visible={toastVisible} />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  fieldError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginHorizontal: 16,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#450a0a',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  errorBannerText: {
    fontSize: 13,
    color: '#fca5a5',
    fontWeight: '500',
  },
  templatesSeparator: {
    height: 1,
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  offlineHint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#334155',
    marginTop: 8,
    marginHorizontal: 24,
    marginBottom: 4,
  },
  // Toast / Snackbar
  snackbar: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  snackbarText: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
