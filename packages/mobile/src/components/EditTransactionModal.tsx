import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import type React from 'react';
import { X, Calendar, ChevronLeft } from 'lucide-react-native';
import { useUpdateTransaction, useCategories } from '@/api/transactions';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { DatePickerCalendar } from './DatePickerCalendar';
import * as Haptics from 'expo-haptics';

interface EditTransactionModalProps {
  visible: boolean;
  transaction: any;
  onClose: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

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
    if (!selectedCategoryId) {
      Alert.alert('Error', 'Por favor selecciona una categoría');
      return;
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);
    updateTransaction(
      {
        id: transaction._id || transaction.id,
        data: {
          amount: amountInCents,
          date,
          description,
          categoryId: selectedCategoryId,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          handleClose();
        },
        onError: () => {
          Alert.alert('Error', 'No se pudo actualizar la transacción');
        },
      },
    );
  };

  const isValid = amount && description && selectedCategoryId;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton} hitSlop={8}>
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Editar transacción</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Amount */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Cantidad</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currencySymbol}>€</Text>
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
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Descripción</Text>
              <TextInput
                style={styles.input}
                placeholder="Descripción de la transacción"
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                selectionColor={colors.primary}
              />
            </View>

            {/* Category */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Categoría</Text>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                activeOpacity={0.7}
              >
                <Text style={[styles.selectorText, !selectedCategory && styles.placeholderText]}>
                  {selectedCategory?.name || 'Seleccionar categoría'}
                </Text>
                <Text style={styles.selectorChevron}>{showCategoryPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showCategoryPicker && (
                <View style={styles.pickerList}>
                  <FlatList
                    data={filteredCategories}
                    keyExtractor={(item) => item._id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.pickerItem,
                          selectedCategoryId === item._id && styles.pickerItemSelected,
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
                            selectedCategoryId === item._id && styles.pickerItemTextSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </View>

            {/* Date */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Fecha</Text>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => setShowDatePicker(!showDatePicker)}
                activeOpacity={0.7}
              >
                <Calendar size={16} color={colors.primary} />
                <Text style={styles.selectorText}>{date}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <View style={styles.calendarWrap}>
                  <DatePickerCalendar
                    selectedDate={date}
                    onDateSelect={(newDate) => {
                      setDate(newDate);
                      setShowDatePicker(false);
                    }}
                    colors={colors}
                  />
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Notas</Text>
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
              style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!isValid || isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitText}>Guardar cambios</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
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
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.bg,
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
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.xl,
      gap: spacing.md,
      paddingBottom: spacing.xxxl,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      ...shadow.sm,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    currencySymbol: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.primary,
    },
    amountInput: {
      flex: 1,
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      paddingVertical: spacing.xs,
    },
    input: {
      fontSize: 15,
      color: colors.text,
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    notesInput: {
      minHeight: 72,
      paddingTop: spacing.xs,
    },
    selectorBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    selectorText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    placeholderText: {
      color: colors.textTertiary,
    },
    selectorChevron: {
      fontSize: 10,
      color: colors.textTertiary,
    },
    pickerList: {
      marginTop: spacing.sm,
      borderRadius: radius.sm,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerItemSelected: {
      backgroundColor: colors.primaryLight,
    },
    categoryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    pickerItemText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    pickerItemTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    calendarWrap: {
      marginTop: spacing.sm,
    },
    submitBtn: {
      paddingVertical: 16,
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    submitBtnDisabled: {
      backgroundColor: colors.textTertiary,
    },
    submitText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.white,
    },
  });
}
