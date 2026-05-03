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
import { useCreateGoal, useUpdateGoal, type Goal } from '@/api/goals';
import { formatDate } from '@/lib/formatters';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { DatePickerCalendar } from './DatePickerCalendar';
import * as Haptics from 'expo-haptics';

const PRESET_COLORS = [
  '#0052CC', '#00C896', '#FF4757', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

const TODAY = new Date().toISOString().split('T')[0];

interface GoalFormModalProps {
  visible: boolean;
  goal?: Goal;
  onClose: () => void;
}

export const GoalFormModal: React.FC<GoalFormModalProps> = ({ visible, goal, onClose }) => {
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);
  const isEditing = !!goal;

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { mutate: createGoal, isPending: isCreating } = useCreateGoal();
  const { mutate: updateGoal, isPending: isUpdating } = useUpdateGoal();
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (visible) {
      if (goal) {
        setName(goal.name);
        setTargetAmount(String(goal.targetAmount / 100));
        setCurrentAmount(goal.currentAmount > 0 ? String(goal.currentAmount / 100) : '');
        setDeadline(goal.deadline ? goal.deadline.split('T')[0] : '');
        setColor(goal.color ?? PRESET_COLORS[0]);
      } else {
        setName('');
        setTargetAmount('');
        setCurrentAmount('');
        setDeadline('');
        setColor(PRESET_COLORS[0]);
      }
      setShowDatePicker(false);
    }
  }, [visible, goal]);

  const isValid =
    name.trim().length > 0 &&
    targetAmount.length > 0 &&
    parseFloat(targetAmount.replace(',', '.')) > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    const parsedTarget = Math.round(parseFloat(targetAmount.replace(',', '.')) * 100);
    const parsedCurrent = currentAmount
      ? Math.round(parseFloat(currentAmount.replace(',', '.')) * 100)
      : 0;

    const dto = {
      name: name.trim(),
      targetAmount: parsedTarget,
      currentAmount: parsedCurrent,
      deadline: deadline || undefined,
      color,
    };

    if (isEditing && goal) {
      updateGoal(
        { id: goal._id, data: dto },
        {
          onSuccess: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Keyboard.dismiss();
            onClose();
          },
          onError: () => Alert.alert('Error', 'No se pudo actualizar la meta'),
        },
      );
    } else {
      createGoal(dto, {
        onSuccess: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Keyboard.dismiss();
          onClose();
        },
        onError: () => Alert.alert('Error', 'No se pudo crear la meta'),
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Editar meta' : 'Nueva meta'}</Text>
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
                placeholder="Ej. Vacaciones, Coche, Emergencias…"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                selectionColor={colors.primary}
              />
            </View>

            {/* Target amount */}
            <View style={styles.section}>
              <Text style={styles.label}>Objetivo *</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currencySymbol, { color: colors.primary }]}>€</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="decimal-pad"
                  selectionColor={colors.primary}
                />
              </View>
            </View>

            {/* Current amount */}
            <View style={styles.section}>
              <Text style={styles.label}>Ya ahorrado</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currencySymbol, { color: colors.income }]}>€</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                  keyboardType="decimal-pad"
                  selectionColor={colors.primary}
                />
              </View>
            </View>

            {/* Deadline */}
            <View style={styles.section}>
              <Text style={styles.label}>Fecha límite (opcional)</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(!showDatePicker)}
                activeOpacity={0.8}
              >
                <Calendar size={16} color={colors.primary} />
                <Text style={[styles.dateBtnText, !deadline && { color: colors.textTertiary }]}>
                  {deadline ? formatDate(deadline, 'long') : 'Sin fecha límite'}
                </Text>
                {deadline ? (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); setDeadline(''); setShowDatePicker(false); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
              {showDatePicker ? (
                <DatePickerCalendar
                  selectedDate={deadline || TODAY}
                  onDateSelect={(d) => { setDeadline(d); setShowDatePicker(false); }}
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
                  {isEditing ? 'Guardar cambios' : 'Crear meta'}
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
      width: 36, height: 36, borderRadius: radius.full,
      backgroundColor: colors.card,
      justifyContent: 'center', alignItems: 'center',
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
    amountRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      ...shadow.sm,
    },
    currencySymbol: { fontSize: 22, fontWeight: '800', marginRight: spacing.xs },
    amountInput: {
      flex: 1, paddingVertical: 16, fontSize: 28,
      fontWeight: '700', color: colors.text, letterSpacing: -0.5,
    },
    dateBtn: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.card, borderRadius: radius.md,
      paddingHorizontal: spacing.lg, paddingVertical: 15,
      ...shadow.sm,
    },
    dateBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    colorRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
    colorSwatch: {
      width: 36, height: 36, borderRadius: radius.full,
      borderWidth: 3, borderColor: 'transparent',
    },
    colorSwatchSelected: {
      borderColor: colors.text,
      transform: [{ scale: 1.15 }],
    },
    submitBtn: {
      marginHorizontal: spacing.xl, marginTop: spacing.sm,
      marginBottom: spacing.xxl, paddingVertical: 17,
      borderRadius: radius.full, alignItems: 'center',
      ...shadow.md,
    },
    submitBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  });
}
