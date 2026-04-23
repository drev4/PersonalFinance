/**
 * DateSelector
 *
 * Toggle between "Hoy" and "Otra fecha".
 * When "Otra fecha" is selected a native DateTimePicker is shown using
 * the platform's native UI (iOS spinner / Android calendar).
 *
 * Implementation uses @react-native-community/datetimepicker when
 * available. Since this project doesn't yet depend on it we fall back
 * to a simple date-string input for now, keeping the component
 * interface stable for when the dependency is added.
 */

import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatDate } from '../../lib/formatters';

// ─── Props ────────────────────────────────────────────────────────────────────

interface DateSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function offsetDays(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}

// ─── Inline date picker (platform-agnostic fallback) ──────────────────────────

/**
 * A simple day-picker modal rendered when no native DateTimePicker
 * dependency is installed. Shows ±7 days from today.
 */
function SimpleDatePicker({
  value,
  onConfirm,
  onCancel,
}: {
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const today = new Date();
  const [selected, setSelected] = useState<Date>(value);

  // Show 15 days: 7 past + today + 7 future
  const days = Array.from({ length: 15 }, (_, i) => offsetDays(today, i - 7));

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <View style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>Selecciona una fecha</Text>

          <View style={styles.dayGrid}>
            {days.map((day, idx) => {
              const isSel =
                day.toDateString() === selected.toDateString();
              const isTd = day.toDateString() === today.toDateString();
              const isFuture = day > today;

              return (
                <Pressable
                  key={idx}
                  onPress={() => !isFuture && setSelected(day)}
                  style={[
                    styles.dayCell,
                    isSel && styles.dayCellSelected,
                    isTd && !isSel && styles.dayCellToday,
                    isFuture && styles.dayCellDisabled,
                  ]}
                  disabled={isFuture}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={formatDate(day)}
                  accessibilityState={{ selected: isSel, disabled: isFuture }}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isSel && styles.dayNumberSelected,
                      isFuture && styles.dayNumberDisabled,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  <Text
                    style={[
                      styles.dayName,
                      isSel && styles.dayNumberSelected,
                      isFuture && styles.dayNumberDisabled,
                    ]}
                  >
                    {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.pickerActions}>
            <Pressable
              onPress={onCancel}
              style={styles.pickerCancel}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Cancelar selección de fecha"
            >
              <Text style={styles.pickerCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(selected)}
              style={styles.pickerConfirm}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Confirmar fecha seleccionada"
            >
              <Text style={styles.pickerConfirmText}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DateSelector({
  value,
  onChange,
}: DateSelectorProps): React.JSX.Element {
  const [showPicker, setShowPicker] = useState(false);

  const today = isToday(value);

  const handleTodayPress = useCallback(async () => {
    await Haptics.selectionAsync();
    onChange(new Date());
  }, [onChange]);

  const handleOtherPress = useCallback(async () => {
    await Haptics.selectionAsync();
    setShowPicker(true);
  }, []);

  const handleConfirm = useCallback(
    (date: Date) => {
      setShowPicker(false);
      onChange(date);
    },
    [onChange],
  );

  const handleCancel = useCallback(() => {
    setShowPicker(false);
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Fecha</Text>

      <View style={styles.row}>
        {/* "Hoy" toggle */}
        <Pressable
          onPress={() => void handleTodayPress()}
          style={[styles.toggle, today && styles.toggleSelected]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Hoy"
          accessibilityState={{ selected: today }}
        >
          <Text
            style={[
              styles.toggleText,
              today && styles.toggleTextSelected,
            ]}
          >
            Hoy
          </Text>
        </Pressable>

        {/* "Otra fecha" toggle */}
        <Pressable
          onPress={() => void handleOtherPress()}
          style={[styles.toggle, !today && styles.toggleSelected]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            !today ? formatDate(value) : 'Otra fecha'
          }
          accessibilityState={{ selected: !today }}
        >
          <Text
            style={[
              styles.toggleText,
              !today && styles.toggleTextSelected,
            ]}
          >
            {!today ? formatDate(value) : 'Otra fecha'}
          </Text>
        </Pressable>
      </View>

      {/* Platform note: on a real device the system picker opens.
          Here we use the SimpleDatePicker fallback. */}
      {showPicker ? (
        Platform.OS === 'ios' || Platform.OS === 'android' ? (
          <SimpleDatePicker
            value={value}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        ) : null
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 8,
  },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  toggleSelected: {
    borderColor: '#0ea5e9',
    backgroundColor: '#0ea5e920',
  },
  toggleText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  toggleTextSelected: {
    color: '#0ea5e9',
    fontWeight: '700',
  },
  // Picker modal
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pickerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 16,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  dayCell: {
    width: 42,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  dayCellSelected: {
    backgroundColor: '#0ea5e9',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  dayName: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  dayNumberSelected: {
    color: '#ffffff',
  },
  dayNumberDisabled: {
    color: '#475569',
  },
  pickerActions: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },
  pickerCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  pickerCancelText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  pickerConfirm: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
  },
  pickerConfirmText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '700',
  },
});
