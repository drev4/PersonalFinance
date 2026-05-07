import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  changePassword,
  setup2FA,
  verify2FA,
  disable2FA,
  type TwoFactorSetupResult,
} from '../../api/auth.api';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { useAuthStore } from '../../stores/authStore';

// ─── Password schema ───────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── 2FA step type ─────────────────────────────────────────────────────────────

type TwoFactorStep = 'idle' | 'setup' | 'disable';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SecurityPage(): React.ReactElement {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const accessToken = useAuthStore((state) => state.accessToken);

  // ── Password state ──
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function handlePasswordSubmit(values: PasswordFormValues): Promise<void> {
    setPasswordError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      form.reset();
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message.includes('INVALID_PASSWORD')
          ? 'La contraseña actual es incorrecta.'
          : 'No se pudo cambiar la contraseña. Intenta de nuevo.';
      setPasswordError(msg);
    }
  }

  // ── 2FA state ──
  const [twoFactorStep, setTwoFactorStep] = useState<TwoFactorStep>('idle');
  const [setupData, setSetupData] = useState<TwoFactorSetupResult | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  async function handleSetup2FA(): Promise<void> {
    setTwoFactorError(null);
    setTwoFactorLoading(true);
    try {
      const data = await setup2FA();
      setSetupData(data);
      setTotpCode('');
      setTwoFactorStep('setup');
    } catch {
      setTwoFactorError('No se pudo iniciar la configuración. Intenta de nuevo.');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function handleVerify2FA(): Promise<void> {
    setTwoFactorError(null);
    setTwoFactorLoading(true);
    try {
      await verify2FA(totpCode);
      if (accessToken && user) setAuth({ ...user, twoFactorEnabled: true }, accessToken);
      setTwoFactorStep('idle');
      setSetupData(null);
      setTotpCode('');
    } catch {
      setTwoFactorError('Código inválido o expirado. Intenta de nuevo.');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function handleDisable2FA(): Promise<void> {
    setTwoFactorError(null);
    setTwoFactorLoading(true);
    try {
      await disable2FA(disablePassword);
      if (accessToken && user) setAuth({ ...user, twoFactorEnabled: false }, accessToken);
      setTwoFactorStep('idle');
      setDisablePassword('');
    } catch {
      setTwoFactorError('Contraseña incorrecta o error al desactivar 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Seguridad</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona tu contraseña y la verificación en dos pasos.
        </p>
      </div>

      {/* ── Change password ── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-gray-500" aria-hidden="true" />
            <CardTitle className="text-base">Cambiar contraseña</CardTitle>
          </div>
          <CardDescription>
            Elige una contraseña segura que no uses en otros sitios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handlePasswordSubmit)}
              noValidate
              className="space-y-4"
            >
              {/* Current password */}
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña actual</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showCurrent ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowCurrent((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                      >
                        {showCurrent ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* New password */}
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showNew ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowNew((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                      >
                        {showNew ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Mínimo 8 caracteres, una mayúscula y un número.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nueva contraseña</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
                </Button>
                {passwordSaved && (
                  <p className="text-sm text-green-600 font-medium" role="status">
                    Contraseña actualizada
                  </p>
                )}
                {passwordError && (
                  <p className="text-sm text-red-600" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ── Two-Factor Authentication ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gray-500" aria-hidden="true" />
            <CardTitle className="text-base">Verificación en dos pasos (2FA)</CardTitle>
          </div>
          <CardDescription>
            {user?.twoFactorEnabled
              ? 'Tu cuenta está protegida con autenticación de dos factores.'
              : 'Añade una capa extra de seguridad con una app de autenticación.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFactorError && (
            <p className="text-sm text-red-600" role="alert">
              {twoFactorError}
            </p>
          )}

          {/* Idle */}
          {twoFactorStep === 'idle' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {user?.twoFactorEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-500" aria-hidden="true" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-gray-400" aria-hidden="true" />
                )}
                <span className="text-sm font-medium text-gray-900">
                  {user?.twoFactorEnabled ? 'Activado' : 'Desactivado'}
                </span>
              </div>
              {user?.twoFactorEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTwoFactorStep('disable');
                    setTwoFactorError(null);
                  }}
                >
                  Desactivar
                </Button>
              ) : (
                <Button size="sm" onClick={() => void handleSetup2FA()} disabled={twoFactorLoading}>
                  {twoFactorLoading ? 'Cargando...' : 'Activar 2FA'}
                </Button>
              )}
            </div>
          )}

          {/* Setup — QR + code input */}
          {twoFactorStep === 'setup' && setupData && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Escanea este código QR con tu app de autenticación (Google Authenticator, Authy,
                etc.)
              </p>
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <QRCodeSVG value={setupData.otpauthUri} size={180} />
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-xs text-gray-500 mb-1">O introduce el código manualmente:</p>
                <code className="text-xs font-mono break-all text-gray-700">
                  {setupData.secret}
                </code>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Código de verificación *
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-xl tracking-widest w-40"
                  autoComplete="one-time-code"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => void handleVerify2FA()}
                  disabled={totpCode.length !== 6 || twoFactorLoading}
                >
                  {twoFactorLoading ? 'Verificando...' : 'Confirmar y activar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTwoFactorStep('idle');
                    setSetupData(null);
                    setTotpCode('');
                    setTwoFactorError(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Disable — password confirmation */}
          {twoFactorStep === 'disable' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Introduce tu contraseña actual para desactivar el 2FA.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Contraseña *</label>
                <Input
                  type="password"
                  placeholder="Tu contraseña actual"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  autoComplete="current-password"
                  className="max-w-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => void handleDisable2FA()}
                  disabled={!disablePassword || twoFactorLoading}
                >
                  {twoFactorLoading ? 'Desactivando...' : 'Desactivar 2FA'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTwoFactorStep('idle');
                    setDisablePassword('');
                    setTwoFactorError(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
