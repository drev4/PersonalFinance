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
import { X, ChevronDown } from 'lucide-react-native';
import {
  useCreateAccount,
  useUpdateAccount,
  type Account,
  type AccountType,
} from '@/api/accounts';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import * as Haptics from 'expo-haptics';

const PRESET_COLORS = [
  '#0052CC', '#00C896', '#FF4757', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Cuenta corriente',
  savings: 'Cuenta ahorro',
  cash: 'Efectivo',
  credit_card: 'Tarjeta de crédito',
  real_estate: 'Inmueble',
  vehicle: 'Vehículo',
  loan: 'Préstamo',
  mortgage: 'Hipoteca',
  crypto: 'Criptomonedas',
  investment: 'Inversiones',
  other: 'Otro',
};

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[];

interface AccountFormModalProps {
  visible: boolean;
  account?: Account;
  onClose: () => void;
}

export const AccountFormModal: React.FC<AccountFormModalProps> = ({
  visible,
  account,
  onClose,
}) => {
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);
  const isEditing = !!account;

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [currency, setCurrency] = useState('EUR');
  const [initialBalance, setInitialBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [includedInNetWorth, setIncludedInNetWorth] = useState(true);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const { mutate: createAccount, isPending: isCreating } = useCreateAccount();
  const { mutate: updateAccount, isPending: isUpdating } = useUpdateAccount();
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (visible) {
      if (account) {
        setName(account.name);
        setType(account.type);
        setCurrency(account.currency);
        setInitialBalance('');
        setInstitution(account.institution ?? '');
        setColor(account.color ?? PRESET_COLORS[0]);
        setIncludedInNetWorth(account.includedInNetWorth);
      } else {
        setName('');
        setType('checking');
        setCurrency('EUR');
        setInitialBalance('');
        setInstitution('');
        setColor(PRESET_COLORS[0]);
        setIncludedInNetWorth(true);
      }
      setShowTypePicker(false);
    }
  }, [visible, account]);

  const isValid = name.trim().length > 0 && currency.trim().length === 3 &&
    (isEditing || (initialBalance !== '' && !isNaN(parseFloat(initialBalance.replace(',', '.')))));

  const handleSubmit = () => {
    if (!isValid) return;

    if (isEditing && account) {
      updateAccount(
        {
          id: account._id,
          data: {
            name: name.trim(),
            type,
            currency: currency.toUpperCase(),
            institution: institution.trim() || undefined,
            color,
            includedInNetWorth,
          },
        },
        {
          onSuccess: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Keyboard.dismiss();
            onClose();
          },
          onError: () => Alert.alert('Error', 'No se pudo actualizar la cuenta'),
        },
      );
    } else {
      const balanceCents = Math.round(
        parseFloat(initialBalance.replace(',', '.')) * 100,
      );
      createAccount(
        {
          name: name.trim(),
          type,
          currency: currency.toUpperCase(),
          initialBalance: balanceCents,
          institution: institution.trim() || undefined,
          color,
          includedInNetWorth,
        },
        {
          onSuccess: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Keyboard.dismiss();
            onClose();
          },
          onError: () => Alert.alert('Error', 'No se pudo crear la cuenta'),
        },
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Editar cuenta' : 'Nueva cuenta'}</Text>
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
                placeholder="Ej. BBVA Principal"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                selectionColor={colors.primary}
              />
            </View>

            {/* Type */}
            <View style={styles.section}>
              <Text style={styles.label}>Tipo *</Text>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => setShowTypePicker(!showTypePicker)}
                activeOpacity={0.8}
              >
                <Text style={styles.selectorText}>{ACCOUNT_TYPE_LABELS[type]}</Text>
                <ChevronDown size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              {showTypePicker && (
                <View style={styles.pickerList}>
                  {ACCOUNT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.pickerItem, type === t && styles.pickerItemActive]}
                      onPress={() => { setType(t); setShowTypePicker(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerItemText, type === t && { color: colors.primary }]}>
                        {ACCOUNT_TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Currency */}
            <View style={styles.section}>
              <Text style={styles.label}>Moneda *</Text>
              <TextInput
                style={styles.input}
                placeholder="EUR"
                placeholderTextColor={colors.textTertiary}
                value={currency}
                onChangeText={(v) => setCurrency(v.toUpperCase().slice(0, 3))}
                autoCapitalize="characters"
                maxLength={3}
                selectionColor={colors.primary}
              />
            </View>

            {/* Initial balance — only on create */}
            {!isEditing && (
              <View style={styles.section}>
                <Text style={styles.label}>Saldo inicial</Text>
                <View style={styles.amountRow}>
                  <Text style={[styles.currencySymbol, { color: colors.primary }]}>
                    {currency || '€'}
                  </Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    value={initialBalance}
                    onChangeText={setInitialBalance}
                    keyboardType="decimal-pad"
                    selectionColor={colors.primary}
                  />
                </View>
              </View>
            )}

            {/* Institution */}
            <View style={styles.section}>
              <Text style={styles.label}>Entidad (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. BBVA, ING, Revolut…"
                placeholderTextColor={colors.textTertiary}
                value={institution}
                onChangeText={setInstitution}
                selectionColor={colors.primary}
              />
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

            {/* Include in net worth */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Incluir en patrimonio neto</Text>
                  <Text style={styles.toggleHint}>Cuenta para el cálculo del patrimonio</Text>
                </View>
                <Switch
                  value={includedInNetWorth}
                  onValueChange={setIncludedInNetWorth}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={includedInNetWorth ? colors.primary : colors.textTertiary}
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
                  {isEditing ? 'Guardar cambios' : 'Crear cuenta'}
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
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    closeBtn: {
      width: 36, height: 36, borderRadius: radius.full,
      backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
      ...shadow.sm,
    },
    section: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
    label: {
      fontSize: 11, fontWeight: '700', color: colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: colors.card, borderRadius: radius.md,
      paddingHorizontal: spacing.lg, paddingVertical: 15,
      fontSize: 15, color: colors.text, fontWeight: '500',
      ...shadow.sm,
    },
    selectorBtn: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: radius.md,
      paddingHorizontal: spacing.lg, paddingVertical: 15,
      ...shadow.sm,
    },
    selectorText: { fontSize: 15, fontWeight: '600', color: colors.text },
    pickerList: {
      marginTop: spacing.xs, backgroundColor: colors.card,
      borderRadius: radius.md, ...shadow.sm,
    },
    pickerItem: {
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    pickerItemActive: { backgroundColor: colors.primaryLight },
    pickerItemText: { fontSize: 15, fontWeight: '600', color: colors.text },
    amountRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: radius.md,
      paddingHorizontal: spacing.lg, ...shadow.sm,
    },
    currencySymbol: { fontSize: 20, fontWeight: '800', marginRight: spacing.xs },
    amountInput: {
      flex: 1, paddingVertical: 15, fontSize: 24,
      fontWeight: '700', color: colors.text, letterSpacing: -0.5,
    },
    colorRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
    colorSwatch: {
      width: 36, height: 36, borderRadius: radius.full,
      borderWidth: 3, borderColor: 'transparent',
    },
    colorSwatchSelected: { borderColor: colors.text, transform: [{ scale: 1.15 }] },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.card, borderRadius: radius.md,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      ...shadow.sm,
    },
    toggleInfo: { flex: 1, marginRight: spacing.md },
    toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
    toggleHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    submitBtn: {
      marginHorizontal: spacing.xl, marginTop: spacing.sm, marginBottom: spacing.xxl,
      paddingVertical: 17, borderRadius: radius.full, alignItems: 'center',
      ...shadow.md,
    },
    submitBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  });
}
