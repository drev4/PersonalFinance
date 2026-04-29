import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Plus, ChevronLeft } from 'lucide-react-native';
import {
  useHoldings,
  usePortfolioSummary,
  useCreateHolding,
  useUpdateHolding,
  useDeleteHolding,
  type HoldingWithValue,
  type AssetType,
  type CreateHoldingDTO,
} from '@/api/holdings';
import { useAccounts } from '@/api/transactions';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { Skeleton } from '@/components/Skeleton';

type TabFilter = 'all' | 'crypto' | 'stock' | 'etf' | 'bond';

export default function PortfolioScreen() {
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingHolding, setEditingHolding] = useState<HoldingWithValue | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    assetType: 'crypto' as AssetType,
    accountId: '',
    symbol: '',
    quantity: '',
    averageBuyPrice: '',
    currency: 'EUR',
  });

  const { data: holdings = [], isLoading, refetch } = useHoldings();
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummary();
  const { data: accounts = [] } = useAccounts();
  const { mutate: createHolding, isPending: isCreating } = useCreateHolding();
  const { mutate: updateHolding, isPending: isUpdating } = useUpdateHolding();
  const { mutate: deleteHolding } = useDeleteHolding();

  const filteredHoldings = holdings.filter((h) => {
    if (activeTab === 'all') return true;
    return h.assetType === activeTab;
  });

  const holdingsByType = {
    all: holdings.length,
    crypto: holdings.filter((h) => h.assetType === 'crypto').length,
    stock: holdings.filter((h) => h.assetType === 'stock').length,
    etf: holdings.filter((h) => h.assetType === 'etf').length,
    bond: holdings.filter((h) => h.assetType === 'bond').length,
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditingHolding(null);
    setFormData({
      assetType: 'crypto',
      accountId: accounts[0]?._id || '',
      symbol: '',
      quantity: '',
      averageBuyPrice: '',
      currency: 'EUR',
    });
    setFormModalVisible(true);
  };

  const openEditModal = (holding: HoldingWithValue) => {
    setEditingHolding(holding);
    setFormData({
      assetType: holding.assetType,
      accountId: holding.accountId,
      symbol: holding.symbol,
      quantity: holding.quantity,
      averageBuyPrice: String(holding.averageBuyPrice),
      currency: holding.currency,
    });
    setFormModalVisible(true);
  };

  const handleSaveHolding = () => {
    if (!formData.accountId || !formData.symbol || !formData.quantity || !formData.averageBuyPrice) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (editingHolding) {
      updateHolding(
        {
          id: editingHolding._id,
          data: {
            quantity: formData.quantity,
            averageBuyPrice: Number(formData.averageBuyPrice),
            currency: formData.currency,
          },
        },
        {
          onSuccess: () => {
            setFormModalVisible(false);
          },
        },
      );
    } else {
      createHolding(
        {
          accountId: formData.accountId,
          assetType: formData.assetType,
          symbol: formData.symbol.toUpperCase(),
          quantity: formData.quantity,
          averageBuyPrice: Number(formData.averageBuyPrice),
          currency: formData.currency,
        } as CreateHoldingDTO,
        {
          onSuccess: () => {
            setFormModalVisible(false);
          },
        },
      );
    }
  };

  const handleDeleteHolding = (holding: HoldingWithValue) => {
    Alert.alert('Eliminar posición', `¿Eliminar ${holding.symbol}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteHolding(holding._id),
      },
    ]);
  };

  const getAssetTypeLabel = (type: AssetType): string => {
    const labels: Record<AssetType, string> = {
      crypto: 'Cripto',
      stock: 'Acción',
      etf: 'ETF',
      bond: 'Bono',
    };
    return labels[type];
  };

  const getAssetTypeColor = (type: AssetType): string => {
    const colors: Record<AssetType, string> = {
      crypto: '#F59E0B',
      stock: '#3B82F6',
      etf: '#8B5CF6',
      bond: '#6366F1',
    };
    return colors[type];
  };

  const getPnLColor = (pnl: number): string => {
    if (pnl > 0) return '#10B981';
    if (pnl < 0) return '#EF4444';
    return '#666';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top'] as const}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Cartera</Text>
            {holdings.length > 0 && (
              <Text style={styles.subtitle}>{holdings.length} posiciones</Text>
            )}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Portfolio Summary */}
        {summaryLoading ? (
          <Skeleton height={120} marginBottom={16} />
        ) : summary && holdings.length > 0 ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Valor Total</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.totalValue, summary.totalValue ? 'EUR' : undefined)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>P&L Total</Text>
              <Text style={[styles.summaryValue, { color: getPnLColor(summary.totalPnl) }]}>
                {summary.totalPnl >= 0 ? '+' : ''}
                {formatCurrency(summary.totalPnl)} ({formatPercentage(summary.totalPnlPercentage)}
                %)
              </Text>
            </View>
            {summary.byAssetType.length > 0 && (
              <View style={styles.assetDistribution}>
                {summary.byAssetType.map((item) => (
                  <View key={item.type} style={styles.assetBadge}>
                    <View
                      style={[styles.assetDot, { backgroundColor: getAssetTypeColor(item.type) }]}
                    />
                    <Text style={styles.assetBadgeText}>
                      {getAssetTypeLabel(item.type)} {formatPercentage(item.percentage)}%
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {(['all', 'crypto', 'stock', 'etf', 'bond'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
              >
                {tab === 'all' ? 'Todas' : getAssetTypeLabel(tab as AssetType)} (
                {holdingsByType[tab]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Holdings List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={80} marginBottom={12} />
            <Skeleton height={80} marginBottom={12} />
            <Skeleton height={80} />
          </View>
        ) : filteredHoldings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No hay posiciones</Text>
            <Text style={styles.emptySubtitle}>
              {holdings.length === 0
                ? 'Comienza a invertir'
                : 'No hay posiciones de este tipo'}
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
              <Text style={styles.emptyButtonText}>Añadir posición</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredHoldings}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.holdingCard}>
                <View style={styles.holdingLeft}>
                  <View>
                    <Text style={styles.holdingSymbol}>{item.symbol}</Text>
                    <Text style={styles.holdingExchange}>
                      {item.exchange || 'Manual'} • {item.quantity} unidades @ €
                      {(item.averageBuyPrice / 100).toFixed(2)}
                    </Text>
                  </View>
                </View>
                <View style={styles.holdingRight}>
                  <Text style={styles.holdingValue}>
                    {formatCurrency(item.currentValue)}
                  </Text>
                  <Text style={[styles.holdingPnL, { color: getPnLColor(item.pnl) }]}>
                    {item.pnl >= 0 ? '+' : ''}
                    {formatCurrency(item.pnl)} ({formatPercentage(item.pnlPercentage)}%)
                  </Text>
                  <Text style={styles.holdingPercentage}>{formatPercentage(item.portfolioPercentage)}% de cartera</Text>
                </View>
                <TouchableOpacity
                  style={styles.holdingMenu}
                  onPress={() => openEditModal(item)}
                >
                  <Text style={styles.menuText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.holdingMenu}
                  onPress={() => handleDeleteHolding(item)}
                >
                  <Text style={styles.menuText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
            ListFooterComponent={<View style={{ height: 20 }} />}
          />
        )}
      </ScrollView>

      {/* Add/Edit Holding Modal */}
      <Modal
        visible={formModalVisible}
        animationType="slide"
        onRequestClose={() => setFormModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right', 'bottom'] as const}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFormModalVisible(false)}>
              <ChevronLeft size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingHolding ? 'Editar posición' : 'Nueva posición'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Asset Type Selector */}
            {!editingHolding && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Tipo de Activo</Text>
                <View style={styles.assetTypeGrid}>
                  {(['crypto', 'stock', 'etf', 'bond'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.assetTypeButton,
                        formData.assetType === type && styles.assetTypeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, assetType: type })}
                    >
                      <Text
                        style={[
                          styles.assetTypeButtonText,
                          formData.assetType === type && styles.assetTypeButtonTextActive,
                        ]}
                      >
                        {getAssetTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Account Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cuenta</Text>
              <View style={styles.pickerLike}>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account._id}
                    style={[
                      styles.pickerOption,
                      formData.accountId === account._id && styles.pickerOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, accountId: account._id })}
                  >
                    <Text style={styles.pickerOptionText}>{account.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Symbol Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Símbolo (ticker)</Text>
              <TextInput
                style={styles.input}
                placeholder="ej: BTC, AAPL, ETH"
                value={formData.symbol}
                onChangeText={(v) => setFormData({ ...formData, symbol: v })}
                placeholderTextColor="#999"
              />
            </View>

            {/* Quantity Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cantidad</Text>
              <TextInput
                style={styles.input}
                placeholder="0.0000"
                value={formData.quantity}
                onChangeText={(v) => setFormData({ ...formData, quantity: v })}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />
            </View>

            {/* Average Buy Price */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Precio Medio de Compra (€)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={formData.averageBuyPrice}
                onChangeText={(v) => setFormData({ ...formData, averageBuyPrice: v })}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (isCreating || isUpdating) && styles.submitButtonDisabled]}
              onPress={handleSaveHolding}
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingHolding ? 'Actualizar' : 'Añadir'} Posición
                </Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066CC',
  },
  assetDistribution: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  assetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  assetBadgeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  tabActive: {
    backgroundColor: '#0066CC',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
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
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0066CC',
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  holdingCard: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdingLeft: {
    flex: 1,
  },
  holdingRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  holdingSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  holdingExchange: {
    fontSize: 12,
    color: '#999',
  },
  holdingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
  },
  holdingPnL: {
    fontSize: 12,
    fontWeight: '600',
  },
  holdingPercentage: {
    fontSize: 11,
    color: '#999',
  },
  holdingMenu: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
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
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  assetTypeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  assetTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  assetTypeButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  assetTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  assetTypeButtonTextActive: {
    color: '#fff',
  },
  pickerLike: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionActive: {
    backgroundColor: '#f0f0f0',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0066CC',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
