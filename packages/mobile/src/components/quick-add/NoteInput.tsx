/**
 * NoteInput
 *
 * Single-line text field for transaction notes.
 * While the user types, suggestCategoryFromNote() runs and surfaces a
 * category suggestion banner. The parent component uses this suggestion
 * to pre-select a CategoryChip.
 *
 * The suggestion is non-blocking and purely advisory.
 */

import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { suggestCategoryFromNote } from '../../lib/note-suggester';

// ─── Props ────────────────────────────────────────────────────────────────────

interface NoteInputProps {
  value: string;
  onChange: (text: string) => void;
  /** Called whenever the suggestion changes (including null) */
  onSuggestion?: (categoryName: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NoteInput({
  value,
  onChange,
  onSuggestion,
}: NoteInputProps): React.JSX.Element {
  const lastSuggestion = useRef<string | null>(null);

  const handleChangeText = useCallback(
    (text: string) => {
      onChange(text);

      if (onSuggestion) {
        const suggestion = suggestCategoryFromNote(text);
        if (suggestion !== lastSuggestion.current) {
          lastSuggestion.current = suggestion;
          onSuggestion(suggestion);
        }
      }
    },
    [onChange, onSuggestion],
  );

  const suggestion = suggestCategoryFromNote(value);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Nota</Text>

      <TextInput
        value={value}
        onChangeText={handleChangeText}
        placeholder="Añadir nota (opcional)"
        placeholderTextColor="#475569"
        style={styles.input}
        maxLength={255}
        returnKeyType="done"
        accessible
        accessibilityLabel="Nota de la transacción"
        accessibilityHint="Campo opcional. Máximo 255 caracteres"
        accessibilityRole="none"
        autoCorrect
        autoCapitalize="sentences"
      />

      {/* Suggestion banner */}
      {suggestion != null && value.length > 0 ? (
        <View style={styles.suggestionBanner}>
          <Text style={styles.suggestionText}>
            Sugerencia de categoría:{' '}
            <Text style={styles.suggestionValue}>{suggestion}</Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#334155',
  },
  suggestionBanner: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0c4a6e33',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  suggestionText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  suggestionValue: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
});
