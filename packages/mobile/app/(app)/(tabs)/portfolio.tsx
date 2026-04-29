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
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useState } from 'react';
import { ChevronLeft, TrendingUp, TrendingDown, Pencil, Trash2 } from 'lucide-react-native';
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
import { colors, radius, spacing, typography, shadow } from '@/theme';

type TabFilter = 'all' | 'crypto' | 'stock' | 'etf' | 'bond';

const ASSET_COLORS: Record<string, string> = {
  crypto: '#F59E0B',
  stock: '#3B82F6',
  etf: '#8B5CF6',
  bond: '#10B981',
};

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

  const { mutate: createHolding, isPending: createPending } = useCreateHolding();
  const { mutate: updateHolding, isPending: updatePending } = useUpdateHolding();
  const { mutate: deleteHolding, isPending: deletePending } = useDeleteHolding();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredHoldings = holdings.filter((h) => activeTab === 'all' || h.assetType === activeTab);

  const holdingCounts = {
    all: holdings.length,
    crypto: holdings.filter((h) => h.assetType === 'crypto').length,
    stock: holdings.filter((h) => h.assetType === 'stock').length,
    etf: holdings.filter((h) => h.assetType === 'etf').length,
    bond: holdings.filter((h) => h.assetType === 'bond').length,
  };

  const handleOpenModal = (holding?: HoldingWithValue) => {
    if (holding) {
      setEditingHolding(holding);
      setFormData({
        assetType: holding.assetType,
        accountId: holding.accountId,
        symbol: holding.symbol,
        quantity: holding.quantity,
        averageBuyPrice: String(holding.averageBuyPrice),
        currency: holding.currency,
      });
    } else {
      setEditingHolding(null);
      setFormData({
        assetType: 'crypto',
        accountId: accounts[0]?._id || '',
        symbol: '',
        quantity: '',
        averageBuyPrice: '',
        currency: 'EUR',
      });
    }
    setFormModalVisible(true);
  };

  const handleCloseModal = () => {
    setFormModalVisible(false);
    setEditingHolding(null);
  };

  const handleSubmit = () => {
    if (
      !formData.symbol ||
      !formData.quantity ||
      !formData.averageBuyPrice ||
      !formData.accountId
    ) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    const holdingData: CreateHoldingDTO = {
      accountId: formData.accountId,
      assetType: formData.assetType,
      symbol: formData.symbol.toUpperCase(),
      quantity: formData.quantity,
      averageBuyPrice: parseFloat(formData.averageBuyPrice),
      currency: formData.currency,
    };

    if (editingHolding) {
      updateHolding(
        {
          id: editingHolding._id,
          data: {
            accountId: formData.accountId,
            quantity: formData.quantity,
            averageBuyPrice: parseFloat(formData.averageBuyPrice),
            currency: formData.currency,
          },
        },
        {
          onSuccess: () => {
            handleCloseModal();
            refetch();
          },
          onError: () => Alert.alert('Error', 'No se pudo actualizar la posición'),
        },
      );
    } else {
      createHolding(holdingData, {
        onSuccess: () => {
          handleCloseModal();
          refetch();
        },
        onError: () => Alert.alert('Error', 'No se pudo crear la posición'),
      });
    }
  };

  const handleDelete = (holding: HoldingWithValue) => {
    Alert.alert('Eliminar posición', `¿Seguro que deseas eliminar ${holding.symbol}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          deleteHolding(holding._id, {
            onSuccess: () => refetch(),
            onError: () => Alert.alert('Error', 'No se pudo eliminar'),
          }),
      },
    ]);
  };

  const isFormValid = !!(
    formData.symbol &&
    formData.quantity &&
    formData.averageBuyPrice &&
    formData.accountId
  );
  const isPending = createPending || updatePending || deletePending;
  const selectedAccount = accounts.find((acc) => acc._id === formData.accountId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Cartera</Text>
            <Text style={styles.subtitle}>
              {holdings.length} posición{holdings.length !== 1 ? 'es' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleOpenModal()}
            disabled={isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.addButtonText}>+ Nueva</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        {summary && holdings.length > 0 && (
          <View style={styles.summaryCard}>
            {summaryLoading ? (
              <Skeleton height={120} style={{ borderRadius: radius.xl }} />
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Valor total</Text>
                  <Text style={styles.summaryTotal}>{formatCurrency(summary.totalValue)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>P&L</Text>
                  <View style={styles.pnlContainer}>
                    {summary.totalPnl >= 0 ? (
                      <TrendingUp size={14} color={colors.income} />
                    ) : (
                      <TrendingDown size={14} color={colors.expense} />
                    )}
                    <Text
                      style={[
                        styles.pnlValue,
                        { color: summary.totalPnl >= 0 ? colors.income : colors.expense },
                      ]}
                    >
                      {formatCurrency(summary.totalPnl)} (
                      {formatPercentage(summary.totalPnlPercentage)})
                    </Text>
                  </View>
                </View>
                {summary.byAssetType.length > 0 && (
                  <>
                    <View style={styles.summaryDivider} />
                    <Text style={[styles.summaryLabel, { marginBottom: spacing.sm }]}>
                      Distribución
                    </Text>
                    <View style={styles.distributionRow}>
                      {summary.byAssetType.map((item) => (
                        <View
                          key={item.type}
                          style={[
                            styles.distBadge,
                            { backgroundColor: (ASSET_COLORS[item.type] || colors.primary) + '18' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.distBadgeText,
                              { color: ASSET_COLORS[item.type] || colors.primary },
                            ]}
                          >
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}{' '}
                            {formatPercentage(item.percentage)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {(['all', 'crypto', 'stock', 'etf', 'bond'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({holdingCounts[tab]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Holdings */}
        {isLoading ? (
          <View style={{ padding: spacing.xl }}>
            <Skeleton height={88} style={{ marginBottom: spacing.md, borderRadius: radius.xl }} />
            <Skeleton height={88} style={{ marginBottom: spacing.md, borderRadius: radius.xl }} />
          </View>
        ) : filteredHoldings.length > 0 ? (
          <FlatList
            data={filteredHoldings}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.holdingsList}
            renderItem={({ item }) => (
              <View style={styles.holdingCard}>
                <View style={styles.holdingTop}>
                  <View
                    style={[
                      styles.holdingTypeDot,
                      { backgroundColor: ASSET_COLORS[item.assetType] || colors.primary },
                    ]}
                  />
                  <View style={styles.holdingInfo}>
                    <Text style={styles.holdingSymbol}>{item.symbol}</Text>
                    <Text style={styles.holdingDetails}>
                      {item.quantity} @ {formatCurrency(item.averageBuyPrice)}
                    </Text>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={styles.holdingValue}>{formatCurrency(item.currentValue)}</Text>
                    <Text
                      style={[
                        styles.holdingPnl,
                        { color: item.pnl >= 0 ? colors.income : colors.expense },
                      ]}
                    >
                      {item.pnl >= 0 ? '+' : ''}
                      {formatCurrency(item.pnl)} ({formatPercentage(item.pnlPercentage)})
                    </Text>
                  </View>
                </View>
                <View style={styles.holdingBottom}>
                  <Text style={styles.portfolioPct}>
                    {formatPercentage(item.portfolioPercentage)} de cartera
                  </Text>
                  <View style={styles.holdingActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenModal(item)}
                      disabled={isPending}
                    >
                      <Pencil size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.expenseLight }]}
                      onPress={() => handleDelete(item)}
                      disabled={isPending}
                    >
                      <Trash2 size={14} color={colors.expense} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin posiciones</Text>
            <Text style={styles.emptyText}>
              {holdings.length === 0
                ? 'Crea tu primera posición para comenzar'
                : 'No hay posiciones en esta categoría'}
            </Text>
            {holdings.length === 0 && (
              <TouchableOpacity
                style={styles.emptyCTA}
                onPress={() => handleOpenModal()}
                disabled={isPending}
              >
                <Text style={styles.emptyCTAText}>Crear posición</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Form Modal */}
      <Modal visible={formModalVisible} animationType="slide" onRequestClose={handleCloseModal}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.modalNav}>
              <TouchableOpacity
                onPress={handleCloseModal}
                disabled={isPending}
                style={styles.backButton}
              >
                <ChevronLeft size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalNavTitle}>
                {editingHolding ? 'Editar posición' : 'Nueva posición'}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Asset type */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Tipo de activo</Text>
                <View style={styles.typeRow}>
                  {(['crypto', 'stock', 'etf', 'bond'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeChip,
                        formData.assetType === t && {
                          backgroundColor: ASSET_COLORS[t],
                          borderColor: ASSET_COLORS[t],
                        },
                      ]}
                      onPress={() => !editingHolding && setFormData({ ...formData, assetType: t })}
                      disabled={!!editingHolding || isPending}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          formData.assetType === t && styles.typeChipTextActive,
                        ]}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Account */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Cuenta</Text>
                <View style={styles.selectRow}>
                  <Text style={styles.selectText}>
                    {selectedAccount?.name || 'Seleccionar cuenta'}
                  </Text>
                  {selectedAccount && (
                    <Text style={styles.selectSub}>
                      {formatCurrency(selectedAccount.currentBalance)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Symbol */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Símbolo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ej: BTC, AAPL"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.symbol}
                  onChangeText={(t) => setFormData({ ...formData, symbol: t.toUpperCase() })}
                  editable={!isPending}
                />
              </View>

              {/* Quantity */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Cantidad *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.quantity}
                  onChangeText={(t) => setFormData({ ...formData, quantity: t })}
                  keyboardType="decimal-pad"
                  editable={!isPending}
                />
              </View>

              {/* Avg buy price */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Precio promedio de compra *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.averageBuyPrice}
                  onChangeText={(t) => setFormData({ ...formData, averageBuyPrice: t })}
                  keyboardType="decimal-pad"
                  editable={!isPending}
                />
              </View>

              {/* Currency */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Moneda</Text>
                <View style={styles.selectRow}>
                  <Text style={styles.selectText}>{formData.currency}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, (!isFormValid || isPending) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!isFormValid || isPending}
                activeOpacity={0.85}
              >
                {isPending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingHolding ? 'Guardar cambios' : 'Crear posición'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    ...shadow.sm,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    ...shadow.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  pnlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pnlValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  distributionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  distBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  distBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabsRow: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    ...shadow.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  holdingsList: {
    paddingHorizontal: spacing.xl,
  },
  holdingCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  holdingTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  holdingTypeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingSymbol: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
  },
  holdingDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  holdingPnl: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  holdingBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  portfolioPct: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  holdingActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyCTA: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  emptyCTAText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.sm,
  },
  modalNavTitle: {
    ...typography.subheading,
  },
  formScroll: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  formSection: {
    marginBottom: spacing.xl,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: colors.white,
  },
  selectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
    ...shadow.sm,
  },
  selectText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  selectSub: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    ...shadow.sm,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
    ...shadow.md,
  },
  submitBtnDisabled: {
    backgroundColor: colors.textTertiary,
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
