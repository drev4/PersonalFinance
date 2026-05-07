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
import { useCreateDebt, useUpdateDebt, type Debt, type DebtType, TYPE_LABELS } from '@/api/debts';
import { formatDate } from '@/lib/formatters';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { DatePickerCalendar } from './DatePickerCalendar';
import * as Haptics from 'expo-haptics';

const PRESET_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#8B5CF6',
  '#6366F1',
  '#3B82F6',
  '#EC4899',
  '#14B8A6',
];

const DEBT_TYPES: DebtType[] = [
  'credit_card',
  'personal_loan',
  'mortgage',
  'student_loan',
  'car_loan',
  'other',
];

const TODAY = new Date().toISOString().split('T')[0];

interface DebtFormModalProps {
  visible: boolean;
  debt?: Debt;
  onClose: () => void;
}

export const DebtFormModal: React.FC<DebtFormModalProps> = ({ visible, debt, onClose }) => {
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);
  const isEditing = !!debt;

  const [name, setName] = useState('');
  const [type, setType] = useState<DebtType>('credit_card');
  const [currency, setCurrency] = useState('EUR');
  const [originalAmount, setOriginalAmount] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { mutate: createDebt, isPending: isCreating } = useCreateDebt();
  const { mutate: updateDebt, isPending: isUpdating } = useUpdateDebt();
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (visible) {
      if (debt) {
        setName(debt.name);
        setType(debt.type);
        setCurrency(debt.currency);
        setOriginalAmount(String(debt.originalAmount / 100));
        setCurrentBalance(String(debt.currentBalance / 100));
        setInterestRate(String(debt.interestRate));
        setMinimumPayment(debt.minimumPayment > 0 ? String(debt.minimumPayment / 100) : '');
        setNextPaymentDate(debt.nextPaymentDate ? debt.nextPaymentDate.split('T')[0] : '');
        setColor(debt.color ?? PRESET_COLORS[0]);
      } else {
        setName('');
        setType('credit_card');
        setCurrency('EUR');
        setOriginalAmount('');
        setCurrentBalance('');
        setInterestRate('');
        setMinimumPayment('');
        setNextPaymentDate('');
        setColor(PRESET_COLORS[0]);
      }
      setShowDatePicker(false);
    }
  }, [visible, debt]);

  const isValid =
    name.trim().length > 0 &&
    originalAmount.length > 0 &&
    parseFloat(originalAmount.replace(',', '.')) > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    const parsedOriginal = Math.round(parseFloat(originalAmount.replace(',', '.')) * 100);
    const parsedBalance = currentBalance
      ? Math.round(parseFloat(currentBalance.replace(',', '.')) * 100)
      : parsedOriginal;
    const parsedRate = interestRate ? parseFloat(interestRate.replace(',', '.')) : 0;
    const parsedMin = minimumPayment
      ? Math.round(parseFloat(minimumPayment.replace(',', '.')) * 100)
      : 0;

    const dto = {
      name: name.trim(),
      type,
      currency: currency.toUpperCase(),
      originalAmount: parsedOriginal,
      currentBalance: parsedBalance,
      interestRate: parsedRate,
      minimumPayment: parsedMin,
      nextPaymentDate: nextPaymentDate || undefined,
      color,
    };

    if (isEditing && debt) {
      updateDebt(
        { id: debt._id, data: dto },
        {
          onSuccess: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Keyboard.dismiss();
            onClose();
          },
          onError: () => Alert.alert('Error', 'No se pudo actualizar la deuda'),
        },
      );
    } else {
      createDebt(dto, {
        onSuccess: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Keyboard.dismiss();
          onClose();
        },
        onError: () => Alert.alert('Error', 'No se pudo crear la deuda'),
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Editar deuda' : 'Nueva deuda'}</Text>
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

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Name */}
            <View style={styles.section}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Hipoteca ING, Tarjeta BBVA…"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                selectionColor={colors.expense}
              />
            </View>

            {/* Type */}
            <View style={styles.section}>
              <Text style={styles.label}>Tipo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeRow}>
                  {DEBT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeChip,
                        type === t && {
                          backgroundColor: colors.expense,
                          borderColor: colors.expense,
                        },
                      ]}
                      onPress={() => setType(t)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.typeChipText, type === t && { color: colors.white }]}>
                        {TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Currency */}
            <View style={styles.section}>
              <Text style={styles.label}>Moneda</Text>
              <TextInput
                style={styles.input}
                placeholder="EUR"
                placeholderTextColor={colors.textTertiary}
                value={currency}
                onChangeText={(v) => setCurrency(v.toUpperCase())}
                maxLength={3}
                autoCapitalize="characters"
                selectionColor={colors.expense}
              />
            </View>

            {/* Original amount */}
            <View style={styles.section}>
              <Text style={styles.label}>Deuda original *</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currencySymbol, { color: colors.expense }]}>{currency}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  value={originalAmount}
                  onChangeText={setOriginalAmount}
                  keyboardType="decimal-pad"
                  selectionColor={colors.expense}
                />
              </View>
            </View>

            {/* Current balance */}
            <View style={styles.section}>
              <Text style={styles.label}>Saldo actual</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currencySymbol, { color: colors.expense }]}>{currency}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="(igual que deuda original)"
                  placeholderTextColor={colors.textTertiary}
                  value={currentBalance}
                  onChangeText={setCurrentBalance}
                  keyboardType="decimal-pad"
                  selectionColor={colors.expense}
                />
              </View>
            </View>

            {/* Interest rate */}
            <View style={styles.section}>
              <Text style={styles.label}>Interés anual (%)</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>%</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  value={interestRate}
                  onChangeText={setInterestRate}
                  keyboardType="decimal-pad"
                  selectionColor={colors.expense}
                />
              </View>
            </View>

            {/* Minimum payment */}
            <View style={styles.section}>
              <Text style={styles.label}>Pago mínimo/mes</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>
                  {currency}
                </Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  value={minimumPayment}
                  onChangeText={setMinimumPayment}
                  keyboardType="decimal-pad"
                  selectionColor={colors.expense}
                />
              </View>
            </View>

            {/* Next payment date */}
            <View style={styles.section}>
              <Text style={styles.label}>Próximo pago (opcional)</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(!showDatePicker)}
                activeOpacity={0.8}
              >
                <Calendar size={16} color={colors.expense} />
                <Text
                  style={[styles.dateBtnText, !nextPaymentDate && { color: colors.textTertiary }]}
                >
                  {nextPaymentDate ? formatDate(nextPaymentDate, 'long') : 'Sin fecha de pago'}
                </Text>
                {nextPaymentDate ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setNextPaymentDate('');
                      setShowDatePicker(false);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
              {showDatePicker ? (
                <DatePickerCalendar
                  selectedDate={nextPaymentDate || TODAY}
                  onDateSelect={(d) => {
                    setNextPaymentDate(d);
                    setShowDatePicker(false);
                  }}
                  colors={colors}
                />
              ) : null}
            </View>

            {/* Color */}
            <View style={styles.section}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      color === c && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setColor(c)}
                    activeOpacity={0.8}
                  />
                ))}
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: isValid ? colors.expense : colors.textTertiary },
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isEditing ? 'Guardar cambios' : 'Crear deuda'}
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
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadow.sm,
    },
    section: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
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
    typeRow: { flexDirection: 'row', gap: spacing.sm },
    typeChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    typeChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      ...shadow.sm,
    },
    currencySymbol: { fontSize: 20, fontWeight: '800', marginRight: spacing.xs },
    amountInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
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
    dateBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    colorRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
    colorSwatch: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    colorSwatchSelected: {
      borderColor: colors.text,
      transform: [{ scale: 1.15 }],
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
    submitBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  });
}
