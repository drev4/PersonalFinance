import { useMutation, useQuery, type UseMutationResult } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  register,
  login,
  completeTwoFactorLogin,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  type AuthResponse,
  type RegisterData,
  type LoginData,
  type LoginResult,
} from '../api/auth.api';
import i18n from '../lib/i18n';
import { useAuthStore } from '../stores/authStore';

export function useRegister(): UseMutationResult<AuthResponse, Error, RegisterData> {
  return useMutation<AuthResponse, Error, RegisterData>({
    mutationFn: register,
  });
}

export function useLogin(
  onRequiresTwoFactor: (tempToken: string) => void,
): UseMutationResult<LoginResult, Error, LoginData> {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation<LoginResult, Error, LoginData>({
    mutationFn: login,
    onSuccess: (data) => {
      if (data.requiresTwoFactor && data.tempToken) {
        onRequiresTwoFactor(data.tempToken);
        return;
      }
      if (data.user && data.accessToken) {
        setAuth(data.user, data.accessToken);
        const locale = data.user.preferences?.locale;
        if (locale && locale !== i18n.language) {
          void i18n.changeLanguage(locale);
        }
        void navigate('/dashboard');
      }
    },
  });
}

export function useCompleteTwoFactorLogin(): UseMutationResult<
  AuthResponse,
  Error,
  { tempToken: string; totpCode: string }
> {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ tempToken, totpCode }) => completeTwoFactorLogin(tempToken, totpCode),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      const locale = data.user.preferences?.locale;
      if (locale && locale !== i18n.language) {
        void i18n.changeLanguage(locale);
      }
      void navigate('/dashboard');
    },
  });
}

export function useLogout(): UseMutationResult<void, Error, void> {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation<void, Error, void>({
    mutationFn: logout,
    onSuccess: () => {
      clearAuth();
      void navigate('/login');
    },
    onError: () => {
      // Force logout even if the server call fails
      clearAuth();
      void navigate('/login');
    },
  });
}

export function useForgotPassword(): UseMutationResult<void, Error, string> {
  return useMutation<void, Error, string>({
    mutationFn: forgotPassword,
  });
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export function useResetPassword(): UseMutationResult<void, Error, ResetPasswordData> {
  return useMutation<void, Error, ResetPasswordData>({
    mutationFn: ({ token, newPassword }) => resetPassword(token, newPassword),
  });
}

// Mantiene el usuario del store sincronizado con el servidor.
// Se ejecuta en AppLayout para que cualquier cambio hecho desde mobile
// (baseCurrency, locale) se refleje en el web sin necesidad de re-login.
export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const user = await getMe();
      const { accessToken: token } = useAuthStore.getState();
      if (token) {
        useAuthStore.getState().setAuth(user, token);
      }
      const locale = user.preferences?.locale;
      if (locale && locale !== i18n.language) {
        void i18n.changeLanguage(locale);
      }
      return user;
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}
