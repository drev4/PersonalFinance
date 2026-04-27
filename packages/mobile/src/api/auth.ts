import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { useAuthStore } from '@/stores/authStore';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    baseCurrency?: string;
    role?: string;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean;
    preferences?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
    lastLoginAt?: string;
  };
  accessToken: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export const useLogin = () => {
  const { setUser, setTokens } = useAuthStore();

  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await client.post<{ data: LoginResponse }>('/auth/login', data);
      return response.data.data;
    },
    onSuccess: async (data) => {
      const { user, accessToken } = data;
      setUser(user);
      await setTokens(accessToken, accessToken);
    },
  });
};

export const useRegister = () => {
  const { setUser, setTokens } = useAuthStore();

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const response = await client.post<{ data: LoginResponse }>('/auth/register', data);
      return response.data.data;
    },
    onSuccess: async (data) => {
      const { user, accessToken } = data;
      setUser(user);
      await setTokens(accessToken, accessToken);
    },
  });
};

export const useLogout = () => {
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await client.post('/auth/logout');
    },
    onSuccess: async () => {
      queryClient.clear();
      await clearAuth();
    },
    onError: async () => {
      queryClient.clear();
      await clearAuth();
    },
  });
};
