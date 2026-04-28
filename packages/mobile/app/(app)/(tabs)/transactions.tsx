import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, ChevronLeft, Edit2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTransactions, useAccounts, useCategories } from '@/api/transactions';
import { formatCurrency, formatDate } from '@/lib/formatters';

function getMonthRange() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  return { from: fromStr, to: toStr };
}

const { from: DEFAULT_FROM, to: DEFAULT_TO } = getMonthRange();

interface Transaction {
  _id: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  date: string;
  description: string;
  categoryId?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function getTransactionTypeColor(type: string): string {
  switch (type) {
    case 'income':
      return '#10b981';
    case 'expense':
      return '#ef4444';
    case 'transfer':
      return '#8b5cf6';
    default:
      return '#6b7280';
  }
}

export default function TransactionsScreen() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const { data: accountsData = [] } = useAccounts();
  const { data: categoriesData = [] } = useCategories();

  const filters = {
    from,
    to,
    ...(accountId && { accountId }),
    ...(categoryId && { categoryId }),
    ...(type && { type }),
    page: 1,
    limit: 50,
  };

  const { data: transactionsData, isLoading } = useTransactions(filters);
  const transactions = transactionsData?.data ?? [];
  const meta = transactionsData?.meta;

  const hasActiveFilters = from !== DEFAULT_FROM || to !== DEFAULT_TO || accountId || categoryId || type;

  const handleClearFilters = () => {
    setFrom(DEFAULT_FROM);
    setTo(DEFAULT_TO);
    setAccountId('');
    setCategoryId('');
    setType('');
  };

  const handleSelectTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Movimientos</Text>
          <Text style={styles.subtitle}>
            {meta ? `${meta.total} transacciones` : 'Historial de movimientos'}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersPanel}>
        <TouchableOpacity
          style={styles.filtersHeader}
          onPress={() => setFiltersOpen(!filtersOpen)}
        >
          <Text style={styles.filtersTitle}>
            Filtros {hasActiveFilters && '●'}
          </Text>
          {filtersOpen ? (
            <ChevronUp size={20} color="#666" />
          ) : (
            <ChevronDown size={20} color="#666" />
          )}
        </TouchableOpacity>

        {filtersOpen && (
          <ScrollView style={styles.filtersContent} horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterChip}>
              <Text style={styles.filterLabel}>Desde</Text>
              <TouchableOpacity onPress={() => setFrom(DEFAULT_FROM)}>
                <Text style={styles.filterValue}>{from}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterChip}>
              <Text style={styles.filterLabel}>Hasta</Text>
              <TouchableOpacity onPress={() => setTo(DEFAULT_TO)}>
                <Text style={styles.filterValue}>{to}</Text>
              </TouchableOpacity>
            </View>

            {accountsData.length > 0 && (
              <View style={styles.filterChip}>
                <Text style={styles.filterLabel}>Cuenta</Text>
                <TouchableOpacity
                  onPress={() =>
                    setAccountId(accountId ? '' : accountsData[0]._id)
                  }
                >
                  <Text style={styles.filterValue}>
                    {accountId
                      ? accountsData.find((a) => a._id === accountId)?.name || 'Todas'
                      : 'Todas'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {categoriesData.length > 0 && (
              <View style={styles.filterChip}>
                <Text style={styles.filterLabel}>Categoría</Text>
                <TouchableOpacity
                  onPress={() =>
                    setCategoryId(categoryId ? '' : categoriesData[0]._id)
                  }
                >
                  <Text style={styles.filterValue}>
                    {categoryId
                      ? categoriesData.find((c) => c._id === categoryId)?.name || 'Todas'
                      : 'Todas'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.filterChip}>
              <Text style={styles.filterLabel}>Tipo</Text>
              <TouchableOpacity
                onPress={() => {
                  if (type === 'income') setType('expense');
                  else if (type === 'expense') setType('transfer');
                  else if (type === 'transfer') setType('');
                  else setType('income');
                }}
              >
                <Text style={styles.filterValue}>
                  {type === 'income'
                    ? 'Ingreso'
                    : type === 'expense'
                      ? 'Gasto'
                      : type === 'transfer'
                        ? 'Transferencia'
                        : 'Todos'}
                </Text>
              </TouchableOpacity>
            </View>

            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.filterClear}
                onPress={handleClearFilters}
              >
                <Text style={styles.filterClearText}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No hay transacciones</Text>
          <Text style={styles.emptySubtitle}>
            No se encontraron transacciones con los filtros actuales
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.transactionRow}
              onPress={() => handleSelectTransaction(item as Transaction)}
            >
              <View style={styles.transactionContent}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDate}>
                    {formatDate(item.date, 'short')}
                  </Text>
                  <Text style={styles.transactionDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                  {item.notes && (
                    <Text style={styles.transactionNotes} numberOfLines={1}>
                      {item.notes}
                    </Text>
                  )}
                </View>

                <View style={styles.transactionRight}>
                  {categoriesData.find((c) => c._id === item.categoryId) && (
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor:
                            (categoriesData.find((c) => c._id === item.categoryId)?.color || '#000') + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          {
                            color: categoriesData.find((c) => c._id === item.categoryId)?.color || '#000',
                          },
                        ]}
                      >
                        {categoriesData.find((c) => c._id === item.categoryId)?.name}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={[styles.transactionAmount, { color: getTransactionTypeColor(item.type) }]}
                  >
                    {item.type === 'expense' ? '-' : '+'}
                    {formatCurrency(item.amount, item.currency)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          scrollEnabled={true}
        />
      )}

      {/* Detail Modal */}
      {selectedTransaction && (
        <Modal
          visible={detailModalVisible}
          animationType="slide"
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <SafeAreaView style={styles.safeContainer} edges={['top']}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                  <ChevronLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Detalle</Text>
                {selectedTransaction.type !== 'transfer' && (
                  <View style={{ width: 24 }} />
                )}
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Amount Card */}
                <View style={styles.amountCard}>
                  <Text style={styles.amountLabel}>Monto</Text>
                  <Text
                    style={[
                      styles.amount,
                      { color: getTransactionTypeColor(selectedTransaction.type) },
                    ]}
                  >
                    {selectedTransaction.type === 'expense' ? '-' : '+'}
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </Text>
                </View>

                {/* Description */}
                <View style={styles.section}>
                  <Text style={styles.label}>Descripción</Text>
                  <Text style={styles.value}>{selectedTransaction.description}</Text>
                </View>

                {/* Date */}
                <View style={styles.section}>
                  <Text style={styles.label}>Fecha</Text>
                  <Text style={styles.value}>
                    {formatDate(selectedTransaction.date, 'long')}
                  </Text>
                </View>

                {/* Account */}
                {accountsData.find((a) => a._id === selectedTransaction.accountId) && (
                  <View style={styles.section}>
                    <Text style={styles.label}>
                      {selectedTransaction.type === 'transfer' ? 'Cuenta origen' : 'Cuenta'}
                    </Text>
                    <View style={styles.accountCard}>
                      <View>
                        <Text style={styles.accountName}>
                          {accountsData.find((a) => a._id === selectedTransaction.accountId)?.name}
                        </Text>
                        <Text style={styles.accountBalance}>
                          Saldo:{' '}
                          {formatCurrency(
                            accountsData.find((a) => a._id === selectedTransaction.accountId)
                              ?.currentBalance || 0,
                            accountsData.find((a) => a._id === selectedTransaction.accountId)
                              ?.currency || 'EUR'
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Category */}
                {selectedTransaction.type !== 'transfer' &&
                  categoriesData.find((c) => c._id === selectedTransaction.categoryId) && (
                    <View style={styles.section}>
                      <Text style={styles.label}>Categoría</Text>
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor:
                              (categoriesData.find(
                                (c) => c._id === selectedTransaction.categoryId
                              )?.color || '#000') + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryBadgeText,
                            {
                              color: categoriesData.find(
                                (c) => c._id === selectedTransaction.categoryId
                              )?.color || '#000',
                            },
                          ]}
                        >
                          {categoriesData.find((c) => c._id === selectedTransaction.categoryId)?.name}
                        </Text>
                      </View>
                    </View>
                  )}

                {/* Notes */}
                {selectedTransaction.notes && (
                  <View style={styles.section}>
                    <Text style={styles.label}>Notas</Text>
                    <Text style={styles.notesText}>{selectedTransaction.notes}</Text>
                  </View>
                )}

                <View style={styles.spacer} />
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  filtersPanel: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterChip: {
    marginRight: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  filterValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  filterClear: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ff4444',
    borderRadius: 6,
  },
  filterClearText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  transactionRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  transactionNotes: {
    fontSize: 12,
    color: '#999',
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  amountCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  accountCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 12,
    color: '#999',
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  spacer: {
    height: 24,
  },
});
