/**
 * FilterPillBar — horizontal scrollable row of active filter chips.
 *
 * Each chip shows a label and an X button to remove that filter.
 * Only renders when at least one filter is active.
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterPill {
  key: string;
  label: string;
}

interface FilterPillBarProps {
  pills: FilterPill[];
  onRemove: (key: string) => void;
}

// ─── Single pill component ────────────────────────────────────────────────────

interface PillProps {
  pill: FilterPill;
  onRemove: (key: string) => void;
}

function Pill({ pill, onRemove }: PillProps): React.JSX.Element {
  const handleRemove = useCallback(() => {
    onRemove(pill.key);
  }, [onRemove, pill.key]);

  return (
    <View
      style={styles.pill}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Filtro activo: ${pill.label}. Toca para eliminar`}
    >
      <Text style={styles.pillLabel} numberOfLines={1}>
        {pill.label}
      </Text>
      <Pressable
        onPress={handleRemove}
        style={styles.removeButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Eliminar filtro ${pill.label}`}
      >
        <Text style={styles.removeIcon}>×</Text>
      </Pressable>
    </View>
  );
}

// ─── Bar component ────────────────────────────────────────────────────────────

export function FilterPillBar({
  pills,
  onRemove,
}: FilterPillBarProps): React.JSX.Element | null {
  if (pills.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityRole="scrollbar"
      accessibilityLabel="Filtros activos"
    >
      {pills.map((pill) => (
        <Pill key={pill.key} pill={pill} onRemove={onRemove} />
      ))}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    maxHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  content: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e933',
    borderWidth: 1,
    borderColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 4,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 4,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38bdf8',
    maxWidth: 120,
  },
  removeButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0ea5e944',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    fontSize: 14,
    color: '#38bdf8',
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },
});
