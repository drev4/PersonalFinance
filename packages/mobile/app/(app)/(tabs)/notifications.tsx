import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  FileText,
  RefreshCw,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react-native';
import { memo, useCallback, useRef, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import {
  useDeleteRead,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  type Notification,
} from '@/api/notifications';
import { formatDate } from '@/lib/formatters';
import { radius, spacing } from '@/theme';
import { useTheme } from '@/theme/useTheme';

const SWIPE_WIDTH = 80;

// --- SwipeableRow ---

const SwipeableRow = memo(
  ({
    children,
    onAction,
    actionLabel,
    actionColor,
    actionIcon,
    rowBg,
  }: {
    children: ReactNode;
    onAction: () => void;
    actionLabel: string;
    actionColor: string;
    actionIcon: ReactNode;
    rowBg: string;
  }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const offset = useRef(0);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => offset.current !== 0,
        onMoveShouldSetPanResponder: (_, gs) => {
          if (Math.abs(gs.dy) > Math.abs(gs.dx)) return false;
          return gs.dx < -8;
        },
        onPanResponderMove: (_, gs) => {
          const next = Math.max(-SWIPE_WIDTH, Math.min(0, offset.current + gs.dx));
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gs) => {
          const landed = offset.current + gs.dx;
          if (landed < -(SWIPE_WIDTH / 2)) {
            Animated.spring(translateX, { toValue: -SWIPE_WIDTH, useNativeDriver: true }).start();
            offset.current = -SWIPE_WIDTH;
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
            offset.current = 0;
          }
        },
      }),
    ).current;

    const close = useCallback(() => {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      offset.current = 0;
    }, [translateX]);

    return (
      <View style={{ backgroundColor: actionColor }}>
        <View style={swipeStyles.action}>
          <TouchableOpacity
            onPress={() => {
              close();
              onAction();
            }}
            style={swipeStyles.actionBtn}
            activeOpacity={0.8}
          >
            {actionIcon}
            <Text style={swipeStyles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        </View>
        <Animated.View
          style={{ transform: [{ translateX }], backgroundColor: rowBg }}
          {...panResponder.panHandlers}
        >
          {children}
        </Animated.View>
      </View>
    );
  },
);

SwipeableRow.displayName = 'SwipeableRow';

const swipeStyles = StyleSheet.create({
  action: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    width: SWIPE_WIDTH,
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

// --- Icon map by type ---

const TYPE_ICONS: Record<Notification['type'], React.ElementType> = {
  budget_exceeded: AlertCircle,
  budget_warning: AlertTriangle,
  goal_reached: Target,
  price_alert: TrendingUp,
  recurring_due: RefreshCw,
  report_ready: FileText,
  sync_error: AlertCircle,
};

// --- NotificationRow ---

const NotificationRow = memo(
  ({
    item,
    onMarkRead,
    c,
  }: {
    item: Notification;
    onMarkRead: () => void;
    c: ReturnType<typeof useTheme>['colors'];
  }) => {
    const Icon = TYPE_ICONS[item.type] ?? Bell;
    const rowBg = c.card;
    const iconBg = item.isRead ? c.border : c.primaryLight;
    const iconColor = item.isRead ? c.textTertiary : c.primary;
    const titleWeight = item.isRead ? ('400' as const) : ('700' as const);

    return (
      <SwipeableRow
        onAction={onMarkRead}
        actionLabel="Leída"
        actionColor={c.income}
        actionIcon={<Check size={20} color="#fff" />}
        rowBg={rowBg}
      >
        <View style={[rowStyles.row, { borderBottomColor: c.border }]}>
          <View style={[rowStyles.iconWrap, { backgroundColor: iconBg }]}>
            <Icon size={18} color={iconColor} strokeWidth={1.8} />
          </View>
          <View style={rowStyles.content}>
            <Text
              style={[rowStyles.title, { color: c.text, fontWeight: titleWeight }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={[rowStyles.message, { color: c.textSecondary }]} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={[rowStyles.date, { color: c.textTertiary }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          {!item.isRead && <View style={[rowStyles.unreadDot, { backgroundColor: c.primary }]} />}
        </View>
      </SwipeableRow>
    );
  },
);

NotificationRow.displayName = 'NotificationRow';

const rowStyles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    marginTop: 2,
    width: 36,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
    marginTop: 2,
  },
  unreadDot: {
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    width: 8,
  },
});

// --- Screen ---

export default function NotificationsScreen(): React.JSX.Element {
  const { colors: c } = useTheme();
  const { data, isLoading, refetch } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteRead = useDeleteRead();

  const notifications = data?.data ?? [];
  const hasUnread = notifications.some((n) => !n.isRead);

  const handleMarkRead = useCallback(
    (id: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      markAsRead.mutate(id);
    },
    [markAsRead],
  );

  const handleMarkAll = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markAllAsRead.mutate();
  }, [markAllAsRead]);

  const handleDeleteRead = useCallback(() => {
    Alert.alert('Limpiar notificaciones', '¿Eliminar todas las notificaciones leídas?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        onPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteRead.mutate();
        },
        style: 'destructive',
        text: 'Eliminar',
      },
    ]);
  }, [deleteRead]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: c.bg }]} edges={['top']}>
        <ActivityIndicator style={styles.loader} color={c.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: c.border, backgroundColor: c.card }]}>
        <Text style={[styles.title, { color: c.text }]}>Notificaciones</Text>
        <View style={styles.headerActions}>
          {hasUnread && (
            <TouchableOpacity
              onPress={handleMarkAll}
              style={[styles.headerBtn, { backgroundColor: c.primaryLight }]}
              activeOpacity={0.7}
            >
              <CheckCheck size={15} color={c.primary} />
              <Text style={[styles.headerBtnText, { color: c.primary }]}>Todas leídas</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleDeleteRead}
            style={[styles.headerBtn, { backgroundColor: c.expenseLight }]}
            activeOpacity={0.7}
          >
            <Trash2 size={15} color={c.expense} />
          </TouchableOpacity>
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <BellOff size={48} color={c.textTertiary} strokeWidth={1.4} />
          <Text style={[styles.emptyText, { color: c.textTertiary }]}>Sin notificaciones</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow item={item} onMarkRead={() => handleMarkRead(item.id)} c={c} />
          )}
          onRefresh={refetch}
          refreshing={false}
          contentContainerStyle={notifications.length === 0 ? styles.flex : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerBtn: {
    alignItems: 'center',
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  headerBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
