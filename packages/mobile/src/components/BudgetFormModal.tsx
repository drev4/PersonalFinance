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
  Switch,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import type React from 'react';
import { X, Plus, Trash2, Calendar, ChevronDown } from 'lucide-react-native';
import { useCategories } from '@/api/transactions';
import { useCreateBudget, useUpdateBudget, type Budget, type BudgetItem } from '@/api/budgets';
import { formatDate } from '@/lib/formatters';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { DatePickerCalendar } from './DatePickerCalendar';
import * as Haptics from 'expo-haptics';

interface BudgetFormModalProps {
  visible: boolean;
  budget?: Budget;
  onClose: () => void;
}

interface ItemRow {
  key: number;
  categoryId: string;
  amount: string;
  showPicker: boolean;
}

const TODAY = new Date().toISOString().split('T')[0];

export const BudgetFormModal: React.FC<BudgetFormModalProps> = ({
  visible,
  budget,
  onClose,
}) => {
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const isEditing = !!budget;

  const [name, setName] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(TODAY);
  const [rollover, setRollover] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([{ key: 0, categoryId: '', amount: '', showPicker: false }]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [nextKey, setNextKey] = useState(1);

  const { data: categories = [] } = useCategories();
  const expenseCategories = categories.filter((c) => c.type === 'expense' && c.isActive !== false);

  const { mutate: createBudget, isPending: isCreating } = useCreateBudget();
  const { mutate: updateBudget, isPending: isUpdating } = useUpdateBudget();
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (visible) {
      if (budget) {
        setName(budget.name);
        setPeriod(budget.period);
        setStartDate(budget.startDate.split('T')[0]);
        setRollover(budget.rollover);
        const existing = budget.items.map((it, i) => ({
          key: i,
          categoryId: it.categoryId,
          amount: String(it.amount / 100),
          showPicker: false,
        }));
        setItems(existing.length > 0 ? existing : [{ key: 0, categoryId: '', amount: '', showPicker: false }]);
        setNextKey(budget.items.length + 1);
      } else {
        setName('');
        setPeriod('monthly');
        setStartDate(TODAY);
        setRollover(false);
        setItems([{ key: 0, categoryId: '', amount: '', showPicker: false }]);
        setNextKey(1);
      }
      setShowDatePicker(false);
    }
  }, [visible, budget]);

  const addItem = () => {
    setItems((prev) => [...prev, { key: nextKey, categoryId: '', amount: '', showPicker: false }]);
    setNextKey((k) => k + 1);
  };

  const removeItem = (key: number) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const updateItem = (key: number, patch: Partial<Omit<ItemRow, 'key'>>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const togglePicker = (key: number) => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        showPicker: it.key === key ? !it.showPicker : false,
      })),
    );
  };

  const isValid =
    name.trim().length > 0 &&
    items.length > 0 &&
    items.every((it) => it.categoryId && it.amount && parseFloat(it.amount.replace(',', '.')) > 0);

  const handleSubmit = () => {
    if (!isValid) return;

    const parsedItems: BudgetItem[] = items.map((it) => ({
      categoryId: it.categoryId,
      amount: Math.round(parseFloat(it.amount.replace(',', '.')) * 100),
    }));

    const dto = { name: name.trim(), period, startDate, items: parsedItems, rollover };

    if (isEditing && budget) {
      updateBudget(
        { id: budget._id, data: dto },
        {
          onSuccess: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Keyboard.dismiss();
            onClose();
          },
          onError: () => Alert.alert('Error', 'No se pudo actualizar el presupuesto'),
        },
      );
    } else {
      createBudget(dto, {
        onSuccess: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Keyboard.dismiss();
          onClose();
        },
        onError: () => Alert.alert('Error', 'No se pudo crear el presupuesto'),
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Editar presupuesto' : 'Nuevo presupuesto'}</Text>
            <TouchableOpacity
              onPress={() => { Keyboard.dismiss(); onClose(); }}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Name */}
            <View style={styles.section}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Gastos del hogar"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                selectionColor={colors.primary}
              />
            </View>

            {/* Period */}
            <View style={styles.section}>
              <Text style={styles.label}>Periodo</Text>
              <View style={styles.segmented}>
                <TouchableOpacity
                  style={[styles.segmentBtn, period === 'monthly' && styles.segmentBtnActive]}
                  onPress={() => setPeriod('monthly')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentText, period === 'monthly' && styles.segmentTextActive]}>
                    Mensual
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, period === 'yearly' && styles.segmentBtnActive]}
                  onPress={() => setPeriod('yearly')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentText, period === 'yearly' && styles.segmentTextActive]}>
                    Anual
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Start date */}
            <View style={styles.section}>
              <Text style={styles.label}>Fecha de inicio *</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(!showDatePicker)}
                activeOpacity={0.8}
              >
                <Calendar size={16} color={colors.primary} />
                <Text style={styles.dateBtnText}>
                  {startDate ? formatDate(startDate, 'long') : 'Seleccionar fecha'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && startDate ? (
                <DatePickerCalendar
                  selectedDate={startDate}
                  onDateSelect={(d) => {
                    setStartDate(d);
                    setShowDatePicker(false);
                  }}
                  colors={colors}
                />
              ) : null}
            </View>

            {/* Budget items */}
            <View style={styles.section}>
              <Text style={styles.label}>Categorías y límites *</Text>

              {items.map((item, idx) => {
                const selectedCat = expenseCategories.find((c) => c._id === item.categoryId);
                return (
                  <View key={item.key} style={styles.itemBlock}>
                    {/* Row: category selector + delete */}
                    <View style={styles.itemRow}>
                      <TouchableOpacity
                        style={styles.categoryBtn}
                        onPress={() => togglePicker(item.key)}
                        activeOpacity={0.8}
                      >
                        {selectedCat?.color ? (
                          <View style={[styles.catDot, { backgroundColor: selectedCat.color }]} />
                        ) : null}
                        <Text
                          style={[styles.categoryBtnText, !selectedCat && { color: colors.textTertiary }]}
                          numberOfLines={1}
                        >
                          {selectedCat?.name ?? 'Categoría'}
                        </Text>
                        <ChevronDown size={14} color={colors.textSecondary} />
                      </TouchableOpacity>

                      <TextInput
                        style={styles.amountInput}
                        placeholder="0.00"
                        placeholderTextColor={colors.textTertiary}
                        value={item.amount}
                        onChangeText={(v) => updateItem(item.key, { amount: v })}
                        keyboardType="decimal-pad"
                        selectionColor={colors.primary}
                      />

                      {items.length > 1 && (
                        <TouchableOpacity
                          onPress={() => removeItem(item.key)}
                          style={styles.removeBtn}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={16} color={colors.expense} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Category picker */}
                    {item.showPicker && (
                      <View style={styles.pickerList}>
                        {expenseCategories.map((cat) => (
                          <TouchableOpacity
                            key={cat._id}
                            style={[
                              styles.pickerItem,
                              item.categoryId === cat._id && styles.pickerItemActive,
                            ]}
                            onPress={() => updateItem(item.key, { categoryId: cat._id, showPicker: false })}
                            activeOpacity={0.7}
                          >
                            {cat.color ? (
                              <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                            ) : null}
                            <Text
                              style={[
                                styles.pickerItemText,
                                item.categoryId === cat._id && { color: colors.primary },
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity style={styles.addItemBtn} onPress={addItem} activeOpacity={0.8}>
                <Plus size={16} color={colors.primary} />
                <Text style={styles.addItemText}>Añadir categoría</Text>
              </TouchableOpacity>
            </View>

            {/* Rollover */}
            <View style={styles.section}>
              <View style={styles.rolloverRow}>
                <View style={styles.rolloverInfo}>
                  <Text style={styles.rolloverLabel}>Arrastrar sobrante</Text>
                  <Text style={styles.rolloverHint}>El saldo no gastado pasa al siguiente periodo</Text>
                </View>
                <Switch
                  value={rollover}
                  onValueChange={setRollover}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={rollover ? colors.primary : colors.textTertiary}
                />
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: isValid ? colors.primary : colors.textTertiary },
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isEditing ? 'Guardar cambios' : 'Crear presupuesto'}
                </Text>
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
    section: {
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
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
    segmented: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: 4,
      gap: 4,
      ...shadow.sm,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radius.sm,
      alignItems: 'center',
    },
    segmentBtnActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: colors.white,
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
    itemBlock: {
      marginBottom: spacing.sm,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    categoryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 13,
      ...shadow.sm,
    },
    catDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    categoryBtnText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    amountInput: {
      width: 90,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 13,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'right',
      ...shadow.sm,
    },
    removeBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.expenseLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerList: {
      marginTop: spacing.xs,
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
    pickerItemText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    addItemBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: radius.md,
      borderStyle: 'dashed',
      justifyContent: 'center',
      marginTop: spacing.xs,
    },
    addItemText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    rolloverRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...shadow.sm,
    },
    rolloverInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    rolloverLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rolloverHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
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
