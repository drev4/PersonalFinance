import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Trash2, Edit2 } from 'lucide-react-native';
import { useState, useRef } from 'react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useDeleteTransaction, useAccounts, useCategories } from '@/api/transactions';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ACTION_WIDTH = 100;
const SWIPE_THRESHOLD = -5;

interface TransactionRowProps {
  transaction: any;
  onEdit?: (transaction: any) => void;
  onNavigate?: () => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  onEdit,
  onNavigate,
}) => {
  const { mutate: deleteTransaction, isPending } = useDeleteTransaction();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const [isSwiped, setIsSwiped] = useState(false);

  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, { dx }) => Math.abs(dx) > 5,
      onPanResponderMove: (evt, { dx }) => {
        if (dx < 0) {
          pan.setValue(Math.max(dx, -ACTION_WIDTH));
        } else {
          pan.setValue(Math.min(dx, 0));
        }
      },
      onPanResponderRelease: (evt, { dx, vx }) => {
        // Open if moving left fast, or if moved left with moderate distance
        const isMovingLeftFast = vx < -0.3;
        const isMovingLeftModerate = vx < 0 && dx < -15;
        const stoppedWithMinimalMovement = Math.abs(vx) < 0.1 && dx < -20;

        const shouldOpen = isMovingLeftFast || isMovingLeftModerate || stoppedWithMinimalMovement;

        Animated.timing(pan, {
          toValue: shouldOpen ? -ACTION_WIDTH : 0,
          duration: 150,
          useNativeDriver: true,
        }).start();

        setIsSwiped(shouldOpen);
      },
    })
  ).current;

  const account = accounts.find((a) => a._id === transaction.accountId);
  const category = categories.find((c) => c._id === transaction.categoryId);

  const amountSign = transaction.type === 'expense' ? '-' : '+';
  const amountColor = getTransactionTypeColor(transaction.type);

  const handleEdit = () => {
    Animated.spring(pan, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    onEdit?.(transaction);
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar transacción',
      `¿Estás seguro que deseas eliminar "${transaction.description}"?`,
      [
        {
          text: 'Cancelar',
          onPress: () => {
            Animated.spring(pan, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          },
        },
        {
          text: 'Eliminar',
          onPress: () => {
            deleteTransaction(transaction._id, {
              onSuccess: () => {
                Animated.spring(pan, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start();
              },
            });
          },
          style: 'destructive',
        },
      ],
    );
  };

  return (
    <View style={styles.wrapper}>
      {/* Action buttons background */}
      <View style={styles.actionButtonsBackground}>
        {transaction.type !== 'transfer' && (
          <TouchableOpacity
            style={styles.editActionButton}
            onPress={handleEdit}
          >
            <Edit2 size={20} color="#fff" />
            <Text style={styles.actionLabel}>Editar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.deleteActionButton}
          onPress={handleDelete}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Trash2 size={20} color="#fff" />
              <Text style={styles.actionLabel}>Eliminar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Swipeable content */}
      <Animated.View
        style={[styles.content, { transform: [{ translateX: pan }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.mainContent}
          onPress={() => {
            if (!isSwiped) {
              onNavigate?.();
            } else {
              Animated.spring(pan, {
                toValue: 0,
                useNativeDriver: true,
              }).start();
              setIsSwiped(false);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.mainInfo}>
            <Text style={styles.date}>{formatDate(transaction.date, 'short')}</Text>
            <Text style={styles.description} numberOfLines={1}>
              {transaction.description}
            </Text>
            {transaction.notes && (
              <Text style={styles.notes} numberOfLines={1}>
                {transaction.notes}
              </Text>
            )}
          </View>

          <View style={styles.rightInfo}>
            {category && (
              <View
                style={[
                  styles.category,
                  { backgroundColor: category.color + '20' },
                ]}
              >
                <Text style={[styles.categoryText, { color: category.color }]}>
                  {category.name}
                </Text>
              </View>
            )}
            <Text style={[styles.amount, { color: amountColor }]}>
              {amountSign}
              {formatCurrency(transaction.amount, transaction.currency)}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

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

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonsBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    flexDirection: 'row',
    backgroundColor: '#transparent',
  },
  editActionButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  deleteActionButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    backgroundColor: '#fff',
  },
  mainContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  mainInfo: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  notes: {
    fontSize: 12,
    color: '#999',
  },
  rightInfo: {
    alignItems: 'flex-end',
    gap: 8,
  },
  category: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
