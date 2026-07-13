import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'face' | 'fingerprint' | 'none';

export async function getBiometricType(): Promise<BiometricType> {
  const [compatible, enrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  if (!compatible || !enrolled) return 'none';

  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  return 'none';
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Usar contraseña',
    disableDeviceFallback: false,
    cancelLabel: 'Cancelar',
  });
  return result.success;
}
