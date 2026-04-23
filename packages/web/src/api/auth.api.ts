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
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await apiClient.post<{ data: AuthResponse }>('/auth/register', data);
  return response.data.data;
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await apiClient.post<{ data: AuthResponse }>('/auth/login', data);
  return response.data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, newPassword });
}

export async function verifyEmail(token: string): Promise<void> {
  await apiClient.post('/auth/verify-email', { token });
}

export async function getMe(): Promise<SafeUser> {
  const response = await apiClient.get<SafeUser>('/auth/me');
  return response.data;
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
