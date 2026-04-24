/**
 * transaction-filters.tsx — Filter modal for the transactions list.
 *
 * Filters available:
 *  - Tipo: radio (Gasto, Ingreso, Transferencia)
 *  - Categoría: list (only categories matching selected type)
 *  - Rango de fechas: from / to date strings
 *  - Pendientes: toggle for offline-pending transactions
 *
 * Receives current filters and onApply via navigation params.
 * Closes itself after applying.
 */

import { DEFAULT_CATEGORIES } from '@finanzas/shared';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { TransactionFilters } from '@/api/hooks/useTransactions';
import type { TransactionFormType } from '@/schemas/transaction.schemas';

// ─── Static categories ────────────────────────────────────────────────────────

interface CategoryOption {
  id: string;
  name: string;
  color: string;
  type: 'income' | 'expense';
}

const CATEGORIES: CategoryOption[] = DEFAULT_CATEGORIES.filter(
  (c): c is (typeof DEFAULT_CATEGORIES)[number] & { type: 'income' | 'expense' } =>
    c.type === 'income' || c.type === 'expense',
).map((c, idx) => ({
  id: `cat_${idx}_${c.name.toLowerCase().replace(/\s/g, '_')}`,
  name: c.name,
  color: c.color,
  type: c.type,
}));

// ─── Params type ──────────────────────────────────────────────────────────────

// Filters are passed from the transactions screen via global state
// (stored in a module-level ref that the modal reads and writes back).
// This avoids URL serialization complexity for complex filter objects.

export interface FiltersState {
  type?: TransactionFormType;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  pendingOnly?: boolean;
}

// ─── Section components ───────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Type selector ────────────────────────────────────────────────────────────

interface TypeSelectorProps {
  value: TransactionFormType | undefined;
  onChange: (t: TransactionFormType | undefined) => void;
}

const TYPE_OPTIONS: { label: string; value: TransactionFormType }[] = [
  { label: 'Gasto', value: 'expense' },
  { label: 'Ingreso', value: 'income' },
  { label: 'Transferencia', value: 'transfer' },
];

function TypeSelector({ value, onChange }: TypeSelectorProps): React.JSX.Element {
  return (
    <View style={styles.typeRow}>
      {TYPE_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.typeChip, isSelected && styles.typeChipSelected]}
            onPress={() => onChange(isSelected ? undefined : opt.value)}
            accessible
            accessibilityRole="radio"
            accessibilityLabel={opt.label}
            accessibilityState={{ checked: isSelected }}
          >
            <Text
              style={[
                styles.typeChipText,
                isSelected && styles.typeChipTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Date input ───────────────────────────────────────────────────────────────

interface DateInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function DateInput({ label, value, onChange, placeholder }: DateInputProps): React.JSX.Element {
  return (
    <View style={styles.dateRow}>
      <Text style={styles.dateLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? 'AAAA-MM-DD'}
        placeholderTextColor="#475569"
        style={styles.dateInput}
        keyboardType="numeric"
        maxLength={10}
        accessibilityLabel={label}
      />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// Module-level shared filter state — updated by modal, read by transactions screen
export let pendingFilters: FiltersState = {};

export function setInitialFilters(f: FiltersState): void {
  pendingFilters = { ...f };
}

export default function TransactionFiltersScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ initial?: string }>();

  const initial = useMemo<FiltersState>(() => {
    try {
      return params.initial
        ? (JSON.parse(params.initial) as FiltersState)
        : {};
    } catch {
      return {};
    }
  }, [params.initial]);

  const [filterType, setFilterType] = useState<TransactionFormType | undefined>(
    initial.type,
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(
    initial.categoryId,
  );
  const [dateFrom, setDateFrom] = useState(initial.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(initial.dateTo ?? '');
  const [pendingOnly, setPendingOnly] = useState(initial.pendingOnly ?? false);

  // Filter categories by selected type
  const filteredCategories = useMemo<CategoryOption[]>(() => {
    if (!filterType || filterType === 'transfer') return [];
    return CATEGORIES.filter((c) => c.type === filterType);
  }, [filterType]);

  const handleTypeChange = useCallback((t: TransactionFormType | undefined) => {
    setFilterType(t);
    setCategoryId(undefined); // reset category when type changes
  }, []);

  const handleClear = useCallback(() => {
    setFilterType(undefined);
    setCategoryId(undefined);
    setDateFrom('');
    setDateTo('');
    setPendingOnly(false);
  }, []);

  const handleApply = useCallback(() => {
    const filters: TransactionFilters = {};
    if (filterType) filters.type = filterType;
    if (categoryId) filters.categoryId = categoryId;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    // Store result for the calling screen to pick up
    pendingFilters = {
      type: filterType,
      categoryId,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      pendingOnly,
    };

    router.back();
  }, [filterType, categoryId, dateFrom, dateTo, pendingOnly]);

  const handleCancel = useCallback(() => {
    router.back();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleCancel}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
        >
          <Text style={styles.headerCancel}>Cancelar</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Filtros</Text>

        <Pressable
          onPress={handleClear}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Limpiar filtros"
        >
          <Text style={styles.headerClear}>Limpiar</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type filter */}
        <Section title="Tipo de movimiento">
          <TypeSelector value={filterType} onChange={handleTypeChange} />
        </Section>

        {/* Category filter (only for expense/income) */}
        {filteredCategories.length > 0 ? (
          <Section title="Categoría">
            <View style={styles.categoryGrid}>
              {filteredCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      { borderColor: cat.color },
                      isSelected && { backgroundColor: `${cat.color}22` },
                    ]}
                    onPress={() => setCategoryId(isSelected ? undefined : cat.id)}
                    accessible
                    accessibilityRole="checkbox"
                    accessibilityLabel={cat.name}
                    accessibilityState={{ checked: isSelected }}
                  >
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && { color: cat.color },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>
        ) : null}

        {/* Date range */}
        <Section title="Rango de fechas">
          <DateInput
            label="Desde"
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="2024-01-01"
          />
          <DateInput
            label="Hasta"
            value={dateTo}
            onChange={setDateTo}
            placeholder="2024-12-31"
          />
        </Section>

        {/* Pending toggle */}
        <Section title="Estado">
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Solo pendientes de sincronización</Text>
            <Switch
              value={pendingOnly}
              onValueChange={setPendingOnly}
              trackColor={{ false: '#334155', true: '#0ea5e9' }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#fff'}
              accessibilityRole="switch"
              accessibilityLabel="Mostrar solo transacciones pendientes"
              accessibilityState={{ checked: pendingOnly }}
            />
          </View>
        </Section>
      </ScrollView>

      {/* Apply button */}
      <View style={styles.footer}>
        <Pressable
          style={styles.applyButton}
          onPress={handleApply}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Aplicar filtros"
        >
          <Text style={styles.applyButtonText}>Aplicar filtros</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  headerCancel: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  headerClear: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
  },
  typeChipSelected: {
    borderColor: '#0ea5e9',
    backgroundColor: '#0ea5e920',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  typeChipTextSelected: {
    color: '#38bdf8',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    maxWidth: 100,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  dateLabel: {
    fontSize: 14,
    color: '#94a3b8',
    width: 44,
  },
  dateInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    color: '#f1f5f9',
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    color: '#cbd5e1',
    marginRight: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1e293b',
  },
  applyButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
