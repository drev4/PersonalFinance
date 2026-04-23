/**
 * Auth form validation schemas.
 *
 * Uses zod v4 (same version as @finanzas/shared).
 * @hookform/resolvers v5 supports zod v4 natively.
 * These schemas are mobile-only form-level schemas.
 */

import { z } from 'zod';

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ─── Register ────────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'El email es requerido')
      .email('Ingresa un email válido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'Debes aceptar los términos y condiciones',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Forgot password ──────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ─── Confirm code (forgot password step 2) ────────────────────────────────────

export const confirmCodeSchema = z.object({
  code: z
    .string()
    .min(6, 'El código debe tener 6 dígitos')
    .max(6, 'El código debe tener 6 dígitos')
    .regex(/^\d{6}$/, 'El código sólo contiene números'),
});

export type ConfirmCodeFormData = z.infer<typeof confirmCodeSchema>;

// ─── Reset password ───────────────────────────────────────────────────────────

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ─── Unlock (biometric fallback) ──────────────────────────────────────────────

export const unlockSchema = z.object({
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export type UnlockFormData = z.infer<typeof unlockSchema>;
