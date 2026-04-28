/**
 * transactions.tsx — Main transactions list screen (Fase 4).
 *
 * Features:
 *  - Collapsible header with search input + filter button
 *  - Filter pill bar showing active filters (dismissable chips)
 *  - FlashList grouped by day with sticky headers
 *  - Swipe-to-delete and swipe-to-edit-category on each row
 *  - Pull-to-refresh
 *  - Empty state with CTA to Quick Add
 *  - Loading skeleton
 *  - Infinite scroll via fetchNextPage
 */

import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Filter, Search, X } from 'lucide-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  type AppStateStatus,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDeleteTransaction } from '@/api/hooks/useDeleteTransaction';
import {
  useInvalidateTransactions,
  useTransactions,
  type TransactionFilters,
  type TransactionGroup,
} from '@/api/hooks/useTransactions';
import { useUpdateTransactionCategory } from '@/api/hooks/useUpdateTransactionCategory';
import { FilterPillBar, type FilterPill } from '@/components/transactions/FilterPillBar';
import { TransactionGroupHeader } from '@/components/transactions/TransactionGroupHeader';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { TransactionItemSkeleton } from '@/components/transactions/TransactionItemSkeleton';
import type { Transaction } from '@/schemas/transaction.schemas';
import type { FiltersState } from '../../(modals)/transaction-filters';
import { pendingFilters } from '../../(modals)/transaction-filters';

// ─── List item types ──────────────────────────────────────────────────────────

type ListItem =
  | { kind: 'header'; dateKey: string; group: TransactionGroup }
  | { kind: 'transaction'; transaction: Transaction; dateKey: string };

function buildListItems(groups: TransactionGroup[]): ListItem[] {
  const items: ListItem[] = [];
  for (const group of groups) {
    items.push({ kind: 'header', dateKey: group.dateKey, group });
    for (const tx of group.transactions) {
      items.push({ kind: 'transaction', transaction: tx, dateKey: group.dateKey });
    }
  }
  return items;
}

// ─── Filter pill helpers ──────────────────────────────────────────────────────

function buildPills(filters: FiltersState): FilterPill[] {
  const pills: FilterPill[] = [];
  if (filters.type) {
    const label =
      filters.type === 'expense'
        ? 'Tipo: Gasto'
        : filters.type === 'income'
        ? 'Tipo: Ingreso'
        : 'Tipo: Transferencia';
    pills.push({ key: 'type', label });
  }
  if (filters.categoryId) {
    pills.push({ key: 'categoryId', label: 'Categoría seleccionada' });
  }
  if (filters.dateFrom) {
    pills.push({ key: 'dateFrom', label: `Desde: ${filters.dateFrom}` });
  }
  if (filters.dateTo) {
    pills.push({ key: 'dateTo', label: `Hasta: ${filters.dateTo}` });
  }
  if (filters.pendingOnly) {
    pills.push({ key: 'pendingOnly', label: 'Pendientes' });
  }
  return pills;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState(): React.JSX.Element {
  return (
    <View style={styles.emptyContainer} accessibilityRole="text">
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>No hay movimientos</Text>
      <Text style={styles.emptySubtitle}>
        Añade tu primer movimiento con el botón +
      </Text>
      <Pressable
        style={styles.emptyButton}
        onPress={() => router.push('/(modals)/quick-add')}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Añadir transacción"
      >
        <Text style={styles.emptyButtonText}>Añadir movimiento</Text>
      </Pressable>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TransactionsScreen(): React.JSX.Element {
  // ── Search state ─────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ── Filter state ─────────────────────────────────────────────────────────
  const [activeFilters, setActiveFilters] = useState<FiltersState>({});

  // ── Refresh state ─────────────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);

  const invalidateTransactions = useInvalidateTransactions();

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  // ── Build query filters ───────────────────────────────────────────────────
  const queryFilters = useMemo((): TransactionFilters => {
    const f: TransactionFilters = { limit: 20 };
    if (debouncedSearch) f.search = debouncedSearch;
    if (activeFilters.type) f.type = activeFilters.type;
    if (activeFilters.categoryId) f.categoryId = activeFilters.categoryId;
    if (activeFilters.dateFrom) f.dateFrom = activeFilters.dateFrom;
    if (activeFilters.dateTo) f.dateTo = activeFilters.dateTo;
    return f;
  }, [debouncedSearch, activeFilters]);

  const {
    groups,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    error,
    refetch,
  } = useTransactions(queryFilters);

  const { deleteTransaction } = useDeleteTransaction();
  const { updateCategory } = useUpdateTransactionCategory();

  // ── Poll for filter changes from modal ───────────────────────────────────
  // The modal stores its result in `pendingFilters` (module-level ref).
  // We track app state transitions to pick them up after the modal closes.
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      // When returning to active state, check if filters were updated by modal
      if (
        appState.current.match(/inactive|background/) &&
        next === 'active'
      ) {
        const newFilters = pendingFilters;
        if (Object.keys(newFilters).length > 0 || Object.keys(activeFilters).length > 0) {
          setActiveFilters({ ...newFilters });
        }
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, [activeFilters]);

  // Also pick up filters when screen re-focuses (router.back from modal)
  const lastFocusTimestamp = useRef(0);
  useEffect(() => {
    // Simple polling approach — after filters modal might have closed
    const timer = setInterval(() => {
      const now = Date.now();
      if (now - lastFocusTimestamp.current < 2000) {
        const f = pendingFilters;
        setActiveFilters((prev) => {
          const same = JSON.stringify(prev) === JSON.stringify(f);
          return same ? prev : { ...f };
        });
        lastFocusTimestamp.current = 0;
      }
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // ── Filter pill bar ───────────────────────────────────────────────────────
  const pills = useMemo(() => buildPills(activeFilters), [activeFilters]);

  const handleRemovePill = useCallback((key: string) => {
    void Haptics.selectionAsync();
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (key === 'type') delete next.type;
      if (key === 'categoryId') delete next.categoryId;
      if (key === 'dateFrom') delete next.dateFrom;
      if (key === 'dateTo') delete next.dateTo;
      if (key === 'pendingOnly') delete next.pendingOnly;
      return next;
    });
  }, []);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    invalidateTransactions();
    refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [invalidateTransactions, refetch]);

  // ── Open filters modal ────────────────────────────────────────────────────
  const handleOpenFilters = useCallback(() => {
    void Haptics.selectionAsync();
    lastFocusTimestamp.current = Date.now() + 500;
    const initial = JSON.stringify(activeFilters);
    router.push({
      pathname: '/(modals)/transaction-filters',
      params: { initial },
    });
  }, [activeFilters]);

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (id: string) => {
      void deleteTransaction(id);
    },
    [deleteTransaction],
  );

  // ── Category update handler ───────────────────────────────────────────────
  const handleCategoryUpdate = useCallback(
    (
      transactionId: string,
      categoryId: string,
      categoryName: string,
      categoryColor: string,
    ) => {
      void updateCategory({ transactionId, categoryId, categoryName, categoryColor });
    },
    [updateCategory],
  );

  // ── Build FlashList data ──────────────────────────────────────────────────
  const listItems = useMemo(() => buildListItems(groups), [groups]);

  // ── Filter active indicator ───────────────────────────────────────────────
  const hasActiveFilters = pills.length > 0;

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.kind === 'header') {
        return (
          <TransactionGroupHeader
            dateKey={item.dateKey}
            transactions={item.group.transactions}
          />
        );
      }

      return (
        <TransactionItem
          transaction={item.transaction}
          onDelete={handleDelete}
          onCategoryUpdate={handleCategoryUpdate}
        />
      );
    },
    [handleDelete, handleCategoryUpdate],
  );

  const keyExtractor = useCallback((item: ListItem): string => {
    if (item.kind === 'header') return `header-${item.dateKey}`;
    return `tx-${item.transaction.id}`;
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getItemType = useCallback((item: ListItem): string => {
    return item.kind;
  }, []);

  // ── Footer (loading more indicator) ──────────────────────────────────────
  const ListFooter = useMemo(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <TransactionItemSkeleton count={2} />
      </View>
    );
  }, [isFetchingNextPage]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Movimientos</Text>
      </View>

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Search size={16} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar movimientos..."
            placeholderTextColor="#475569"
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            accessibilityLabel="Buscar transacciones"
            accessibilityRole="search"
          />
          {searchText.length > 0 ? (
            <Pressable
              onPress={() => setSearchText('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <X size={16} color="#64748b" />
            </Pressable>
          ) : null}
        </View>

        {/* Filter button */}
        <Pressable
          style={[
            styles.filterButton,
            hasActiveFilters && styles.filterButtonActive,
          ]}
          onPress={handleOpenFilters}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Filtros${hasActiveFilters ? `, ${pills.length} activos` : ''}`}
        >
          <Filter
            size={18}
            color={hasActiveFilters ? '#38bdf8' : '#94a3b8'}
            strokeWidth={2}
          />
          {hasActiveFilters ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{pills.length}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* ── Active filter pills ────────────────────────────────────────────── */}
      <FilterPillBar pills={pills} onRemove={handleRemovePill} />

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error !== null ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ── Loading skeleton ──────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <TransactionItemSkeleton count={8} />
        </View>
      ) : (
        /* ── FlashList ────────────────────────────────────────────────────── */
        <FlashList
          data={listItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={EmptyState}
          ListFooterComponent={ListFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#0ea5e9"
              colors={['#0ea5e9']}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          accessibilityRole="list"
          accessibilityLabel="Lista de transacciones"
        />
      )}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: -0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#f1f5f9',
    paddingVertical: 0,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#0ea5e920',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#450a0a',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    fontSize: 13,
    color: '#fca5a5',
    fontWeight: '500',
  },
  skeletonContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  footerLoader: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
