/**
 * Button — primary CTA with loading state and disabled feedback.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  ViewStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const variantClasses: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-sky-500 active:bg-sky-600',
    text: 'text-white font-semibold',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-sky-400 font-medium',
  },
  danger: {
    container: 'bg-red-500 active:bg-red-600',
    text: 'text-white font-semibold',
  },
};

export function Button({
  label,
  onPress,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  style,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || isLoading;
  const classes = variantClasses[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      style={style}
      className={[
        'rounded-xl py-4 items-center justify-center flex-row',
        classes.container,
        isDisabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      {isLoading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text className={['text-base', classes.text].join(' ')}>{label}</Text>
      )}
    </Pressable>
  );
}
