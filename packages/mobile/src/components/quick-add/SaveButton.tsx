/**
 * SaveButton
 *
 * Large primary CTA button for the Quick Add sheet.
 * Displays a loading spinner while the mutation is in-flight.
 * Disabled when isPending is true or when disabled prop is passed.
 *
 * Haptics are triggered by the parent (QuickAddSheet) after success/error
 * since the haptic type depends on the outcome.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SaveButtonProps {
  onPress: () => void;
  isPending?: boolean;
  disabled?: boolean;
  label?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SaveButton({
  onPress,
  isPending = false,
  disabled = false,
  label = 'Guardar',
}: SaveButtonProps): React.JSX.Element {
  const isDisabled = isPending || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={isPending ? 'Guardando transacción' : label}
      accessibilityHint="Guarda la transacción y cierra el formulario"
      accessibilityState={{ disabled: isDisabled, busy: isPending }}
    >
      {isPending ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 8,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
});
