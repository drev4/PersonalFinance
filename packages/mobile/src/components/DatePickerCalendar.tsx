import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import type React from 'react';
import type { ThemeColors } from '@/theme';
import { lightColors } from '@/theme';

interface DatePickerCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  colors?: ThemeColors;
}

// Parse YYYY-MM-DD as local date to avoid UTC offset shifting the day
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const DatePickerCalendar: React.FC<DatePickerCalendarProps> = ({
  selectedDate,
  onDateSelect,
  colors: themeColors,
}) => {
  const c = themeColors ?? lightColors;
  const [currentDate, setCurrentDate] = useState(() => parseLocalDate(selectedDate));

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthName = currentDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const selected = parseLocalDate(selectedDate);

  const isSelected = (day: number) =>
    day === selected.getDate() &&
    currentDate.getMonth() === selected.getMonth() &&
    currentDate.getFullYear() === selected.getFullYear();

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const handleDayPress = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onDateSelect(d.toISOString().split('T')[0]);
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  return (
    <View style={[styles.container, { backgroundColor: c.inputBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={8}>
          <ChevronLeft size={22} color={c.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthYear, { color: c.text }]}>{monthName}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={8}>
          <ChevronRight size={22} color={c.primary} />
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={styles.dayNames}>
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => (
          <Text key={i} style={[styles.dayName, { color: c.textTertiary }]}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {days.map((day, index) => {
          const selected_ = day !== null && isSelected(day);
          const today_ = day !== null && isToday(day);
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.cell,
                selected_ && { backgroundColor: c.primary },
                !selected_ && today_ && { borderWidth: 1.5, borderColor: c.primary },
              ]}
              onPress={() => day && handleDayPress(day)}
              disabled={!day}
              activeOpacity={0.7}
            >
              {day !== null && (
                <Text style={[
                  styles.cellText,
                  { color: selected_ ? c.white : today_ ? c.primary : c.text },
                  selected_ && { fontWeight: '700' },
                ]}>
                  {day}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const CELL_SIZE = `${(100 / 7).toFixed(4)}%` as any;

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: {
    padding: 4,
  },
  monthYear: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  dayNames: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayName: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE,
    aspectRatio: 1,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 13,
  },
});
