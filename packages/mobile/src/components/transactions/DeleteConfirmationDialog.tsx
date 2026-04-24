/**
 * DeleteConfirmationDialog — confirmation alert before deleting a transaction.
 *
 * Uses React Native's built-in Alert for native platform dialogs.
 * Call `show()` imperatively; callbacks handle confirm/cancel.
 */

import { Alert } from 'react-native';

interface DeleteConfirmationOptions {
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  title?: string;
  message?: string;
}

/**
 * Imperatively shows a native Alert dialog asking the user to confirm deletion.
 * No JSX component needed — Alert is fully native.
 */
export function showDeleteConfirmation({
  onConfirm,
  onCancel,
  title = 'Borrar transacción',
  message = '¿Estás seguro de que quieres borrar esta transacción? Esta acción no se puede deshacer.',
}: DeleteConfirmationOptions): void {
  // Wrap async onConfirm so Alert.alert receives a void-returning callback
  const handleConfirm = (): void => {
    void onConfirm();
  };

  Alert.alert(title, message, [
    {
      text: 'Cancelar',
      style: 'cancel',
      onPress: onCancel,
    },
    {
      text: 'Borrar',
      style: 'destructive',
      onPress: handleConfirm,
    },
  ]);
}
