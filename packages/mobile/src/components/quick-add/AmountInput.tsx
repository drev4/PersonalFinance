/**
 * AmountInput
 *
 * Large numeric input with real-time euro formatting.
 * The input stores the raw string typed by the user; the formatted
 * representation is shown above and the parsed float is passed to onChange.
 *
 * Formatting rule:
 *   Raw digits "1234" → interpreted as cents → "12,34 €"
 *   This matches the European expectation that users type the full number
 *   including decimal places (e.g. typing "1250" means 12,50 €).
 *
 * Accessibility: labeled "Monto de la transacción", role="none" on the
 * wrapper (the TextInput itself carries the a11y info).
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AmountInputProps {
  value: string;          // raw digit string, e.g. "1250"
  onChange: (raw: string, parsed: number) => void;
  currency?: string;
  autoFocus?: boolean;
}

// ─── Formatter ────────────────────────────────────────────────────────────────

/**
 * Format raw digit string as euro amount.
 * "1250" → "12,50 €"
 * "0" | "" → "0,00 €"
 */
function formatAmount(raw: string, currency: string): string {
  const digits = raw.replace(/\D/g, '');
  const cents = parseInt(digits || '0', 10);
  const euros = cents / 100;

  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(euros);
  } catch {
    return `${euros.toFixed(2)} ${currency}`;
  }
}

/** Parse raw digit string to a float (euro value, not cents) */
function parseAmount(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  return parseInt(digits || '0', 10) / 100;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AmountInput({
  value,
  onChange,
  currency = 'EUR',
  autoFocus = true,
}: AmountInputProps): React.JSX.Element {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus) {
      // Delay to allow the bottom sheet animation to settle
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoFocus]);

  const handleChangeText = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '');
      const parsed = parseAmount(digits);
      onChange(digits, parsed);
    },
    [onChange],
  );

  const formatted = formatAmount(value, currency);
  const isEmpty = !value || value === '0';

  return (
    <View style={styles.container}>
      {/* Formatted display */}
      <Text
        style={[styles.display, isEmpty && styles.displayEmpty]}
        accessibilityLabel={`Monto: ${formatted}`}
      >
        {isEmpty ? '0,00 €' : formatted}
      </Text>

      {/* Hidden but focusable TextInput that receives raw input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        keyboardType="decimal-pad"
        style={styles.hiddenInput}
        accessible
        accessibilityLabel="Monto de la transacción"
        accessibilityHint="Introduce el monto en céntimos; por ejemplo escribe 1250 para 12,50 euros"
        accessibilityRole="none"
        caretHidden
        selection={{ start: value.length, end: value.length }}
        maxLength={10}
        returnKeyType="done"
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  display: {
    fontSize: 48,
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: -1,
    textAlign: 'center',
    minHeight: 64,
  },
  displayEmpty: {
    color: '#475569',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
