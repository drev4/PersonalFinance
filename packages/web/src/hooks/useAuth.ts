import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  type AuthResponse,
  type RegisterData,
  type LoginData,
} from '../api/auth.api';

export function useRegister(): UseMutationResult<AuthResponse, Error, RegisterData> {
  return useMutation<AuthResponse, Error, RegisterData>({
    mutationFn: register,
  });
}

export function useLogin(): UseMutationResult<AuthResponse, Error, LoginData> {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation<AuthResponse, Error, LoginData>({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
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
