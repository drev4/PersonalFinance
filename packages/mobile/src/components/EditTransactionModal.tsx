import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import type React from 'react';
import { X, Calendar } from 'lucide-react-native';
import { useUpdateTransaction, useCategories } from '@/api/transactions';
import { formatDate } from '@/lib/formatters';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { DatePickerCalendar } from './DatePickerCalendar';
import * as Haptics from 'expo-haptics';

interface EditTransactionModalProps {
  visible: boolean;
  transaction: any;
  onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
};

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const typeColor =
    transaction?.type === 'income'
      ? colors.income
      : transaction?.type === 'transfer'
      ? colors.transfer
      : colors.expense;

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: categories = [] } = useCategories();
  const { mutate: updateTransaction, isPending } = useUpdateTransaction();

  useEffect(() => {
    if (transaction && visible) {
      setAmount(String(transaction.amount / 100));
      setDescription(transaction.description);
      setNotes(transaction.notes || '');
      setDate(transaction.date);
      setSelectedCategoryId(transaction.categoryId || '');
      setShowCategoryPicker(false);
      setShowDatePicker(false);
    }
  }, [transaction, visible]);

  const filteredCategories = categories.filter(
    (cat) => cat.type === transaction?.type && cat.isActive !== false,
  );

  const selectedCategory = categories.find((cat) => cat._id === selectedCategoryId);

  const handleSubmit = () => {
    if (!amount || !description) {
      Alert.alert('Error', 'Por favor completa cantidad y descripción');
      return;
    }
    if (transaction?.type !== 'transfer' && !selectedCategoryId) {
      Alert.alert('Error', 'Por favor selecciona una categoría');
      return;
    }

    const amountInCents = Math.round(parseFloat(amount.replace(',', '.')) * 100);
    updateTransaction(
      {
        id: transaction._id || transaction.id,
        data: {
          amount: amountInCents,
          date,
          description,
          categoryId: selectedCategoryId || undefined,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Keyboard.dismiss();
          onClose();
        },
        onError: () => {
          Alert.alert('Error', 'No se pudo actualizar la transacción');
        },
      },
    );
  };

  const isValid =
    transaction?.type === 'transfer'
      ? !!(amount && description)
      : !!(amount && description && selectedCategoryId);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Editar movimiento</Text>
            <TouchableOpacity
              onPress={() => { Keyboard.dismiss(); onClose(); }}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Type badge (read-only) */}
            <View style={styles.typeRow}>
              <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                <Text style={styles.typeBadgeText}>
                  {TYPE_LABEL[transaction?.type] ?? 'Transacción'}
                </Text>
              </View>
            </View>

            {/* Amount */}
            <View style={styles.amountSection}>
              <Text style={styles.sectionLabel}>Cantidad</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currencySymbol, { color: typeColor }]}>€</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  selectionColor={colors.primary}
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Descripción *</Text>
              <TextInput
                style={styles.input}
                placeholder="Descripción obligatoria"
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                selectionColor={colors.primary}
              />
            </View>

            {/* Category (income/expense only) */}
            {transaction?.type !== 'transfer' && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Categoría</Text>
                <TouchableOpacity
                  style={styles.selectorBtn}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.selectorText}>
                    {selectedCategory?.name || 'Seleccionar categoría'}
                  </Text>
                </TouchableOpacity>
                {showCategoryPicker && (
                  <View style={styles.pickerList}>
                    {filteredCategories.map((item) => (
                      <TouchableOpacity
                        key={item._id}
                        style={[
                          styles.pickerItem,
                          selectedCategoryId === item._id && styles.pickerItemActive,
                        ]}
                        onPress={() => {
                          setSelectedCategoryId(item._id);
                          setShowCategoryPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        {item.color && (
                          <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                        )}
                        <Text
                          style={[
                            styles.pickerItemText,
                            selectedCategoryId === item._id && { color: colors.primary },
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Date */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Fecha *</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(!showDatePicker)}
                activeOpacity={0.8}
              >
                <Calendar size={16} color={typeColor} />
                <Text style={styles.dateBtnText}>
                  {date ? formatDate(date, 'long') : 'Seleccionar fecha'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && date ? (
                <DatePickerCalendar
                  selectedDate={date}
                  onDateSelect={(d) => {
                    setDate(d);
                    setShowDatePicker(false);
                  }}
                  colors={colors}
                />
              ) : null}
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notas</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Notas adicionales (opcional)"
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                selectionColor={colors.primary}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: isValid ? typeColor : colors.textTertiary },
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Guardar cambios</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

function createStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadow.sm,
    },
    typeRow: {
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.xl,
    },
    typeBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    typeBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },
    amountSection: {
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.xl,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      ...shadow.sm,
    },
    currencySymbol: {
      fontSize: 22,
      fontWeight: '800',
      marginRight: spacing.xs,
    },
    amountInput: {
      flex: 1,
      paddingVertical: 16,
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    section: {
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    selectorBtn: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 15,
      ...shadow.sm,
    },
    selectorText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    pickerList: {
      marginTop: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      ...shadow.sm,
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerItemActive: {
      backgroundColor: colors.primaryLight,
    },
    categoryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    pickerItemText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
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
    notesInput: {
      textAlignVertical: 'top',
      minHeight: 80,
      paddingTop: spacing.md,
    },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 15,
      ...shadow.sm,
    },
    dateBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    submitBtn: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.sm,
      marginBottom: spacing.xxl,
      paddingVertical: 17,
      borderRadius: radius.full,
      alignItems: 'center',
      ...shadow.md,
    },
    submitBtnText: {
      color: colors.white,
      fontSize: 17,
      fontWeight: '700',
    },
  });
}
