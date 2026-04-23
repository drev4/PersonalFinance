/**
 * QuickAddTemplates
 *
 * Horizontally scrollable row of predefined quick-entry buttons.
 * Pressing a template pre-populates the Quick Add sheet:
 *   - type: "expense"
 *   - categoryName: template-specific
 *   - note: template label
 *   - amount: 0 (editable by user)
 *
 * Renders above the sheet's main form or can be placed anywhere in the
 * tab home screen as a shortcut row.
 */

import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ─── Template data ────────────────────────────────────────────────────────────

export interface QuickTemplate {
  id: string;
  label: string;
  emoji: string;
  categoryName: string;
  note: string;
  type: 'expense' | 'income' | 'transfer';
}

const TEMPLATES: QuickTemplate[] = [
  { id: 'cafe',       label: 'Café',          emoji: '☕', categoryName: 'Restaurantes',  note: 'Café',         type: 'expense' },
  { id: 'gasolina',  label: 'Gasolina',       emoji: '⛽', categoryName: 'Transporte',    note: 'Gasolina',     type: 'expense' },
  { id: 'super',     label: 'Supermercado',   emoji: '🛒', categoryName: 'Alimentación',  note: 'Supermercado', type: 'expense' },
  { id: 'gym',       label: 'Gym',            emoji: '🏋️', categoryName: 'Salud',         note: 'Gimnasio',     type: 'expense' },
  { id: 'farmacia',  label: 'Farmacia',       emoji: '💊', categoryName: 'Salud',         note: 'Farmacia',     type: 'expense' },
  { id: 'taxi',      label: 'Taxi/Uber',      emoji: '🚕', categoryName: 'Transporte',    note: 'Taxi',         type: 'expense' },
  { id: 'restaurante', label: 'Restaurante',  emoji: '🍽️', categoryName: 'Restaurantes',  note: 'Restaurante',  type: 'expense' },
  { id: 'sueldo',    label: 'Sueldo',         emoji: '💼', categoryName: 'Salario',       note: 'Nómina',       type: 'income'  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuickAddTemplatesProps {
  onSelect: (template: QuickTemplate) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickAddTemplates({
  onSelect,
}: QuickAddTemplatesProps): React.JSX.Element {
  const handlePress = useCallback(
    async (template: QuickTemplate) => {
      await Haptics.selectionAsync();
      onSelect(template);
    },
    [onSelect],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Accesos rápidos</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        accessibilityRole="menu"
        accessible={false}
      >
        {TEMPLATES.map((tpl) => (
          <Pressable
            key={tpl.id}
            onPress={() => void handlePress(tpl)}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
            accessible
            accessibilityRole="menuitem"
            accessibilityLabel={`Plantilla ${tpl.label}`}
            accessibilityHint={`Añade un ${tpl.label} rápido`}
          >
            <Text style={styles.emoji}>{tpl.emoji}</Text>
            <Text style={styles.chipLabel} numberOfLines={1}>
              {tpl.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  heading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipPressed: {
    backgroundColor: '#334155',
  },
  emoji: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '500',
  },
});
