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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Calendar } from 'lucide-react-native';
import { useCreateTransaction, useCategories, useAccounts } from '@/api/transactions';
import { formatCurrency } from '@/lib/formatters';
import { DatePickerCalendar } from './DatePickerCalendar';
import * as Haptics from 'expo-haptics';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';

interface QuickAddModalProps {
  onClose: () => void;
}

type TransactionType = 'income' | 'expense' | 'transfer';

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ onClose }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showToAccountPicker, setShowToAccountPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const TYPE_CONFIG = useMemo(
    () => ({
      expense: { label: 'Gasto', color: colors.expense, bg: colors.expenseLight },
      income: { label: 'Ingreso', color: colors.income, bg: colors.incomeLight },
      transfer: { label: 'Transferencia', color: colors.transfer, bg: colors.transferLight },
    }),
    [isDark],
  );

  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { mutate: createTransaction, isPending } = useCreateTransaction();

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) setSelectedAccountId(accounts[0]._id);
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (categories.length === 0) return;
    const filtered = categories.filter((c) => c.type === type && c.isActive !== false);
    if (filtered.length > 0 && !selectedCategoryId) {
      const catId = (filtered[0] as any).id || (filtered[0] as any)._id;
      if (catId) setSelectedCategoryId(catId);
    }
  }, [type, categories, selectedCategoryId]);

  const handleTypeSelect = (newType: TransactionType) => {
    setType(newType);
    setSelectedCategoryId('');
    setSelectedToAccountId('');
    setShowToAccountPicker(false);
    setShowCategoryPicker(false);
  };

  const filteredCategories = categories.filter((c) => c.type === type && c.isActive !== false);
  const selectedAccount = accounts.find((a) => a._id === selectedAccountId);
  const selectedCategory = categories.find((c) => {
    const cId = (c as any).id || (c as any)._id;
    return cId === selectedCategoryId;
  });
  const selectedToAccount = accounts.find((a) => a._id === selectedToAccountId);

  const handleSubmit = async () => {
    if (!amount || !selectedAccountId || !description) {
      Alert.alert('Error', 'Por favor completa cantidad, cuenta y descripción');
      return;
    }
    if (type === 'transfer' && !selectedToAccountId) {
      Alert.alert('Error', 'Por favor selecciona una cuenta destino');
      return;
    }
    if (type !== 'transfer' && !selectedCategoryId) {
      Alert.alert('Error', 'Por favor selecciona una categoría');
      return;
    }

    createTransaction(
      {
        accountId: selectedAccountId,
        type,
        amount: Math.round(parseFloat(amount) * 100),
        currency: selectedAccount?.currency || 'EUR',
        date,
        description,
        categoryId: type === 'transfer' ? undefined : selectedCategoryId,
        toAccountId: type === 'transfer' ? selectedToAccountId : undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Keyboard.dismiss();
          onClose();
        },
        onError: () => Alert.alert('Error', 'No se pudo crear la transacción'),
      },
    );
  };

  const isValid =
    type === 'transfer'
      ? !!(amount && selectedAccountId && description && selectedToAccountId)
      : !!(amount && selectedAccountId && description && selectedCategoryId);

  const activeColor = TYPE_CONFIG[type].color;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Añadir movimiento</Text>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <X size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Type selector */}
        <View style={styles.typeRow}>
          {(['expense', 'income', 'transfer'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeBtn,
                type === t && {
                  backgroundColor: TYPE_CONFIG[t].color,
                  borderColor: TYPE_CONFIG[t].color,
                },
              ]}
              onPress={() => handleTypeSelect(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                {TYPE_CONFIG[t].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionLabel}>Cantidad</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currencySymbol, { color: activeColor }]}>€</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
        </View>

        {/* Account (from) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {type === 'transfer' ? 'Cuenta origen' : 'Cuenta'}
          </Text>
          <TouchableOpacity
            style={styles.selectorBtn}
            onPress={() => setShowAccountPicker(!showAccountPicker)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectorText}>{selectedAccount?.name || 'Seleccionar cuenta'}</Text>
            {selectedAccount && (
              <Text style={styles.selectorSub}>
                {formatCurrency(selectedAccount.currentBalance)}
              </Text>
            )}
          </TouchableOpacity>
          {showAccountPicker && (
            <View style={styles.pickerList}>
              {accounts.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  style={[
                    styles.pickerItem,
                    selectedAccountId === item._id && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setSelectedAccountId(item._id);
                    setShowAccountPicker(false);
                    if (selectedToAccountId === item._id) setSelectedToAccountId('');
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedAccountId === item._id && { color: colors.primary },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.pickerItemSub}>{formatCurrency(item.currentBalance)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Category or To-Account */}
        {type === 'transfer' ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Cuenta destino</Text>
            <TouchableOpacity
              style={styles.selectorBtn}
              onPress={() => setShowToAccountPicker(!showToAccountPicker)}
              activeOpacity={0.8}
            >
              <Text style={styles.selectorText}>
                {selectedToAccount?.name || 'Seleccionar cuenta'}
              </Text>
              {selectedToAccount && (
                <Text style={styles.selectorSub}>
                  {formatCurrency(selectedToAccount.currentBalance)}
                </Text>
              )}
            </TouchableOpacity>
            {showToAccountPicker && (
              <View style={styles.pickerList}>
                {accounts
                  .filter((a) => a._id !== selectedAccountId)
                  .map((item) => (
                    <TouchableOpacity
                      key={item._id}
                      style={[
                        styles.pickerItem,
                        selectedToAccountId === item._id && styles.pickerItemActive,
                      ]}
                      onPress={() => {
                        setSelectedToAccountId(item._id);
                        setShowToAccountPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedToAccountId === item._id && { color: colors.primary },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.pickerItemSub}>
                        {formatCurrency(item.currentBalance)}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        ) : (
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
                {filteredCategories.map((item) => {
                  const catId = (item as any).id || (item as any)._id;
                  return (
                    <TouchableOpacity
                      key={catId}
                      style={[
                        styles.pickerItem,
                        selectedCategoryId === catId && styles.pickerItemActive,
                      ]}
                      onPress={() => {
                        setSelectedCategoryId(catId);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedCategoryId === catId && { color: colors.primary },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Descripción *</Text>
          <TextInput
            style={styles.input}
            placeholder="Descripción obligatoria"
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Fecha *</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowDatePicker(!showDatePicker)}
            activeOpacity={0.8}
          >
            <Calendar size={16} color={activeColor} />
            <Text style={styles.dateBtnText}>{date}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DatePickerCalendar
              selectedDate={date}
              onDateSelect={(d) => {
                setDate(d);
                setShowDatePicker(false);
              }}
            />
          )}
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
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: isValid ? activeColor : colors.textTertiary },
          ]}
          onPress={handleSubmit}
          disabled={!isValid || isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.xl,
    },
    typeBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
    },
    typeBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    typeBtnTextActive: {
      color: colors.white,
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
    selectorSub: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    pickerList: {
      marginTop: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      ...shadow.sm,
    },
    pickerItem: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerItemActive: {
      backgroundColor: colors.primaryLight,
    },
    pickerItemText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    pickerItemSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
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
