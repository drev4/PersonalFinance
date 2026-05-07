import { apiClient } from '../lib/api';
import type { SafeUser } from '../stores/authStore';

export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
  totpCode?: string;
}

export interface LoginResult {
  user?: SafeUser;
  accessToken?: string;
  requiresTwoFactor?: true;
  tempToken?: string;
}

export interface TwoFactorSetupResult {
  secret: string;
  otpauthUri: string;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await apiClient.post<{ data: AuthResponse }>('/auth/register', data);
  return response.data.data;
}

export async function login(data: LoginData): Promise<LoginResult> {
  const response = await apiClient.post<{ data: LoginResult }>('/auth/login', data);
  return response.data.data;
}

export async function completeTwoFactorLogin(
  tempToken: string,
  totpCode: string,
): Promise<AuthResponse> {
  const response = await apiClient.post<{ data: AuthResponse }>('/auth/2fa-login', {
    tempToken,
    totpCode,
  });
  return response.data.data;
}

export async function setup2FA(): Promise<TwoFactorSetupResult> {
  const response = await apiClient.post<{ data: TwoFactorSetupResult }>('/users/me/2fa/setup');
  return response.data.data;
}

export async function verify2FA(totpCode: string): Promise<void> {
  await apiClient.post('/users/me/2fa/verify', { totpCode });
}

export async function disable2FA(password: string): Promise<void> {
  await apiClient.post('/users/me/2fa/disable', { password });
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, newPassword });
}

export async function verifyEmail(token: string): Promise<void> {
  await apiClient.post('/auth/verify-email', { token });
}

export async function getMe(): Promise<SafeUser> {
  const response = await apiClient.get<{ data: { user: SafeUser } }>('/users/me');
  return response.data.data.user;
}

export interface UpdateProfileData {
  name?: string;
  baseCurrency?: string;
  preferences?: {
    locale?: string;
    theme?: 'light' | 'dark';
  };
}

export async function updateMe(data: UpdateProfileData): Promise<SafeUser> {
  const response = await apiClient.patch<{ data: { user: SafeUser } }>('/users/me', data);
  return response.data.data.user;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.patch('/users/me/password', { currentPassword, newPassword });
}
