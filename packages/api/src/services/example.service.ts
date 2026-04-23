import { UserSchema, type User } from '@finanzas/shared';

// Ejemplo de servicio que valida datos usando schemas de @finanzas/shared
export const validateUserData = (data: unknown): { success: boolean; user?: User; error?: string } => {
  try {
    const user = UserSchema.parse(data);
    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
};

// Ejemplo de función que procesa transacciones
export const processTransaction = (amount: number, description: string): { processed: boolean } => {
  // TODO: Implementar lógica de negocio real aquí
  return {
    processed: amount > 0 && description.length > 0,
  };
};
