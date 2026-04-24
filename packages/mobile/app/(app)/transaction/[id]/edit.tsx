/**
 * transaction/[id]/edit.tsx — Full edit form for an existing transaction.
 *
 * Form fields:
 *  - Transaction type (radio)
 *  - Amount
 *  - Account
 *  - Category (filtered by type)
 *  - Date + time (ISO string)
 *  - Note
 *
 * Validation: Zod via editTransactionSchema (extends quickAddSchema).
 * Mutation: PATCH /transactions/:id with optimistic update.
 */

import { DEFAULT_CATEGORIES } from '@finanzas/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient } from '@/api/client';
import { useDashboardSummary } from '@/api/hooks/useDashboardSummary';
import { TRANSACTIONS_KEY } from '@/api/hooks/useTransactions';
import { useUpdateTransaction } from '@/api/hooks/useUpdateTransaction';
import type { AccountChipItem } from '@/components/quick-add/AccountChips';
import { AccountChips } from '@/components/quick-add/AccountChips';
import { AmountInput } from '@/components/quick-add/AmountInput';
import type { CategoryChipItem } from '@/components/quick-add/CategoryChips';
import { CategoryChips } from '@/components/quick-add/CategoryChips';
import { DateSelector } from '@/components/quick-add/DateSelector';
import { NoteInput } from '@/components/quick-add/NoteInput';
import { SaveButton } from '@/components/quick-add/SaveButton';
import { TransactionTypeSelector } from '@/components/quick-add/TransactionTypeSelector';
import {
  editTransactionSchema,
  type EditTransactionFormData,
  type Transaction,
  type TransactionFormType,
} from '@/schemas/transaction.schemas';

// ─── Static categories ────────────────────────────────────────────────────────

const STATIC_CATEGORIES: CategoryChipItem[] = DEFAULT_CATEGORIES.map(
  (c, idx) => ({
    id: `cat_${idx}_${c.name.toLowerCase().replace(/\s/g, '_')}`,
    name: c.name,
    color: c.color,
    type: c.type === 'income' ? 'income' : 'expense',
  }),
);

// ─── Cache lookup helpers ─────────────────────────────────────────────────────

interface InfinitePageData {
  data: Transaction[];
  nextCursor?: string | null;
}

interface InfiniteData {
  pages: InfinitePageData[];
  pageParams: unknown[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditTransactionScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { updateTransaction, isPending: isSaving } = useUpdateTransaction();
  const { data: dashboard } = useDashboardSummary();

  const [amountRaw, setAmountRaw] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [categorySuggestion, setCategorySuggestion] = useState<string | null>(null);

  // ── Load transaction ────────────────────────────────────────────────────
  const { data: transaction, isLoading } = useQuery<Transaction, Error>({
    queryKey: ['transaction', id],
    queryFn: async () => {
      // Check cache first
      const allCacheData = queryClient.getQueriesData<InfiniteData>({
        queryKey: TRANSACTIONS_KEY,
      });
      for (const [, cacheData] of allCacheData) {
        if (!cacheData) continue;
        for (const page of cacheData.pages) {
          const found = page.data.find((tx) => tx.id === id);
          if (found) return found;
        }
      }
      const response = await apiClient.get<Transaction>(`/transactions/${id}`);
      return response.data;
    },
    staleTime: 10 * 1000,
    enabled: Boolean(id),
  });

  // ── Form ─────────────────────────────────────────────────────────────────
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditTransactionFormData>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: {
      type: 'expense',
      amount: 0,
      accountId: '',
      categoryId: undefined,
      date: new Date().toISOString(),
      note: '',
    },
  });

  // Pre-fill form with loaded transaction
  useEffect(() => {
    if (!transaction) return;
    reset({
      type: transaction.type,
      amount: transaction.amount,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      date: transaction.date,
      note: transaction.note ?? '',
    });
    setAmountRaw(String(transaction.amount));
    setSelectedDate(new Date(transaction.date));
  }, [transaction, reset]);

  // Sync date to form
  useEffect(() => {
    setValue('date', selectedDate.toISOString());
  }, [selectedDate, setValue]);

  const selectedType: TransactionFormType = watch('type');
  const selectedAccountId = watch('accountId');

  // ── Account chips ─────────────────────────────────────────────────────────
  const accountChips = useMemo<AccountChipItem[]>(
    () =>
      (dashboard?.accounts ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        color: a.color,
        currency: a.currency,
        balance: a.balance,
      })),
    [dashboard?.accounts],
  );

  // Pre-select account if none set
  useEffect(() => {
    const first = accountChips[0];
    if (first && !selectedAccountId) {
      setValue('accountId', first.id);
    }
  }, [accountChips, selectedAccountId, setValue]);

  // ── Category chips ────────────────────────────────────────────────────────
  const categoryChips = useMemo<CategoryChipItem[]>(() => {
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

  // ── Amount handler ────────────────────────────────────────────────────────
  const handleAmountChange = useCallback(
    (raw: string, parsed: number) => {
      setAmountRaw(raw);
      setValue('amount', parsed, { shouldValidate: true });
    },
    [setValue],
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = useCallback(
    async (data: EditTransactionFormData) => {
      if (!id) return;
      try {
        await updateTransaction(id, {
          type: data.type,
          amount: data.amount,
          accountId: data.accountId,
          categoryId: data.categoryId,
          date: data.date,
          note: data.note,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } catch (err) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const message =
          err instanceof Error ? err.message : 'Error al guardar los cambios';
        Alert.alert('Error', message, [{ text: 'OK' }]);
      }
    },
    [id, updateTransaction],
  );

  const firstError = Object.values(errors)[0]?.message;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Navigation header ──────────────────────────────────────────────── */}
      <View style={styles.navHeader}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Cancelar edición"
        >
          <ArrowLeft size={22} color="#94a3b8" strokeWidth={2} />
        </Pressable>
        <Text style={styles.navTitle}>Editar transacción</Text>
        <View style={styles.backButton} />
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
          {/* Type */}
          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <TransactionTypeSelector selected={value} onChange={onChange} />
            )}
          />

          {/* Amount */}
          <AmountInput
            value={amountRaw}
            onChange={handleAmountChange}
            currency="EUR"
          />
          {errors.amount ? (
            <Text style={styles.fieldError}>{errors.amount.message}</Text>
          ) : null}

          {/* Account */}
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

          {/* Category */}
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

          {/* Date */}
          <DateSelector value={selectedDate} onChange={setSelectedDate} />

          {/* Note */}
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

          {/* Validation error */}
          {firstError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{firstError}</Text>
            </View>
          ) : null}

          {/* Save */}
          <SaveButton
            onPress={() => void handleSubmit(onSubmit)()}
            isPending={isSaving}
            disabled={isSaving}
            label="Guardar cambios"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  flex: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
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
});
