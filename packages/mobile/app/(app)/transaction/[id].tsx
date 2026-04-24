/**
 * transaction/[id].tsx — Transaction detail screen.
 *
 * Layout:
 *  - Header: back arrow + type icon + large amount
 *  - Card: account, category, date/time, note
 *  - Attachments section (photo thumbnails) if present
 *  - Actions: Edit, Delete, Share
 *
 * Data: fetched from React Query cache first, falls back to GET /transactions/:id.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Edit3,
  Share2,
  Trash2,
} from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient } from '@/api/client';
import { useDeleteTransaction } from '@/api/hooks/useDeleteTransaction';
import { TRANSACTIONS_KEY } from '@/api/hooks/useTransactions';
import { showDeleteConfirmation } from '@/components/transactions/DeleteConfirmationDialog';
import { formatCurrency } from '@/lib/formatters';
import type { Transaction } from '@/schemas/transaction.schemas';

// ─── Type helpers ─────────────────────────────────────────────────────────────

interface TypeMeta {
  label: string;
  icon: React.JSX.Element;
  amountColor: string;
  sign: string;
}

function getTypeMeta(type: Transaction['type']): TypeMeta {
  switch (type) {
    case 'income':
      return {
        label: 'Ingreso',
        icon: <ArrowDownLeft size={22} color="#10b981" strokeWidth={2} />,
        amountColor: '#10b981',
        sign: '+',
      };
    case 'expense':
      return {
        label: 'Gasto',
        icon: <ArrowUpRight size={22} color="#ef4444" strokeWidth={2} />,
        amountColor: '#ef4444',
        sign: '-',
      };
    case 'transfer':
    default:
      return {
        label: 'Transferencia',
        icon: <ArrowLeftRight size={22} color="#38bdf8" strokeWidth={2} />,
        amountColor: '#38bdf8',
        sign: '',
      };
  }
}

// ─── Detail row component ─────────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

function DetailRow({ label, value, valueColor }: DetailRowProps): React.JSX.Element {
  return (
    <View style={styles.detailRow} accessibilityRole="text">
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, valueColor ? { color: valueColor } : null]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: React.JSX.Element;
  label: string;
  onPress: () => void;
  color?: string;
  destructive?: boolean;
}

function ActionButton({
  icon,
  label,
  onPress,
  color = '#0ea5e9',
  destructive = false,
}: ActionButtonProps): React.JSX.Element {
  return (
    <Pressable
      style={[
        styles.actionButton,
        { borderColor: color },
        destructive && styles.actionButtonDestructive,
      ]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Cache lookup helper ──────────────────────────────────────────────────────

interface InfinitePageData {
  data: Transaction[];
  nextCursor?: string | null;
}

interface InfiniteData {
  pages: InfinitePageData[];
  pageParams: unknown[];
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TransactionDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { deleteTransaction, isPending: isDeleting } = useDeleteTransaction();

  // Try cache first, then fetch from API
  const { data: transaction, isLoading } = useQuery<Transaction, Error>({
    queryKey: ['transaction', id],
    queryFn: async () => {
      // 1. Look in paginated cache
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

      // 2. Fetch from API
      const response = await apiClient.get<Transaction>(`/transactions/${id}`);
      return response.data;
    },
    staleTime: 10 * 1000,
    enabled: Boolean(id),
  });

  const typeMeta = useMemo(
    () => (transaction ? getTypeMeta(transaction.type) : null),
    [transaction],
  );

  // ── Formatted date/time ──────────────────────────────────────────────────
  const formattedDateTime = useMemo(() => {
    if (!transaction?.date) return '';
    const d = new Date(transaction.date);
    return d.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [transaction?.date]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleEdit = useCallback(() => {
    void Haptics.selectionAsync();
    (router.push as (href: string) => void)(`/transaction/${id ?? ''}/edit`);
  }, [id]);

  const handleDelete = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    showDeleteConfirmation({
      onConfirm: async () => {
        try {
          await deleteTransaction(id ?? '');
          router.back();
        } catch {
          Alert.alert('Error', 'No se pudo borrar la transacción. Intenta de nuevo.');
        }
      },
    });
  }, [deleteTransaction, id]);

  const handleShare = useCallback(() => {
    if (!transaction || !typeMeta) return;
    const text = `${typeMeta.label}: ${typeMeta.sign}${formatCurrency(transaction.amount, transaction.currency)}\n${
      transaction.categoryName ? `Categoría: ${transaction.categoryName}\n` : ''
    }Fecha: ${formattedDateTime}${
      transaction.note ? `\nNota: ${transaction.note}` : ''
    }`;
    void Share.share({ message: text });
  }, [transaction, typeMeta, formattedDateTime]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction || !typeMeta) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={22} color="#94a3b8" strokeWidth={2} />
        </Pressable>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Transacción no encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

  const amountDisplay = `${typeMeta.sign}${formatCurrency(transaction.amount, transaction.currency)}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Navigation header ──────────────────────────────────────────────── */}
      <View style={styles.navHeader}>
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={22} color="#94a3b8" strokeWidth={2} />
        </Pressable>
        <Text style={styles.navTitle}>Detalle</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Amount hero ─────────────────────────────────────────────────── */}
        <View style={styles.heroSection} accessibilityRole="text">
          <View style={styles.heroIconWrapper}>
            {typeMeta.icon}
          </View>
          <Text style={styles.heroType}>{typeMeta.label}</Text>
          <Text
            style={[styles.heroAmount, { color: typeMeta.amountColor }]}
            accessibilityLabel={`Importe: ${amountDisplay}`}
          >
            {amountDisplay}
          </Text>
          {transaction.status === 'pending' ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Pendiente de sincronización</Text>
            </View>
          ) : null}
        </View>

        {/* ── Detail card ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          {transaction.accountName ? (
            <DetailRow label="Cuenta" value={transaction.accountName} />
          ) : null}

          {transaction.categoryName ? (
            <DetailRow
              label="Categoría"
              value={transaction.categoryName}
              valueColor={transaction.categoryColor}
            />
          ) : null}

          <DetailRow label="Fecha y hora" value={formattedDateTime} />

          {transaction.note ? (
            <DetailRow label="Nota" value={transaction.note} />
          ) : null}
        </View>

        {/* ── Attachments ─────────────────────────────────────────────────── */}
        {transaction.attachments && transaction.attachments.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adjuntos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attachmentsRow}
            >
              {transaction.attachments.map((uri, idx) => (
                <View
                  key={`${uri}-${idx}`}
                  style={styles.attachmentThumb}
                  accessible
                  accessibilityLabel={`Adjunto ${idx + 1}`}
                  accessibilityRole="image"
                >
                  {/* Placeholder — real image component needs expo-image */}
                  <View style={styles.attachmentPlaceholder} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          <View style={styles.actionsGrid}>
            <ActionButton
              icon={<Edit3 size={20} color="#0ea5e9" strokeWidth={2} />}
              label="Editar"
              onPress={handleEdit}
              color="#0ea5e9"
            />
            <ActionButton
              icon={<Share2 size={20} color="#64748b" strokeWidth={2} />}
              label="Compartir"
              onPress={handleShare}
              color="#64748b"
            />
            <ActionButton
              icon={
                isDeleting ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Trash2 size={20} color="#ef4444" strokeWidth={2} />
                )
              }
              label="Borrar"
              onPress={handleDelete}
              color="#ef4444"
              destructive
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  errorText: {
    fontSize: 16,
    color: '#64748b',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  heroIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  pendingBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#78350f22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  pendingBadgeText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flexShrink: 0,
    width: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '500',
    textAlign: 'right',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  attachmentsRow: {
    gap: 8,
  },
  attachmentThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachmentPlaceholder: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#1e293b',
    gap: 6,
  },
  actionButtonDestructive: {
    backgroundColor: '#450a0a22',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
