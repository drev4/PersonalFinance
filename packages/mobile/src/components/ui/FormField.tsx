/**
 * FormField — labelled TextInput with real-time error display.
 * Wraps react-hook-form Controller for consistent styling.
 */

import React, { forwardRef } from 'react';
import {
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

interface FormFieldProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  required?: boolean;
}

export const FormField = forwardRef<TextInput, FormFieldProps>(
  function FormField(
    { label, value, onChangeText, error, required = false, ...rest },
    ref,
  ) {
    const hasError = Boolean(error);

    return (
      <View className="mb-4">
        <Text
          className="text-slate-300 text-sm font-medium mb-1.5"
          accessibilityLabel={label}
        >
          {label}
          {required && (
            <Text className="text-red-400"> *</Text>
          )}
        </Text>

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          accessible
          accessibilityLabel={label}
          accessibilityRole="text"
          accessibilityState={{ selected: false }}
          accessibilityHint={error ?? undefined}
          className={[
            'bg-slate-800 rounded-xl px-4 py-3.5',
            'text-white text-base',
            'border',
            hasError ? 'border-red-500' : 'border-slate-700',
          ].join(' ')}
          placeholderTextColor="#64748b"
          {...rest}
        />

        {hasError && (
          <Text
            className="text-red-400 text-xs mt-1"
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            {error}
          </Text>
        )}
      </View>
    );
  },
);
