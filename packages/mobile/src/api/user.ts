import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { useAuthStore } from '@/stores/authStore';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  baseCurrency: string;
  role?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  preferences?: {
    locale?: string;
    theme?: 'light' | 'dark';
    dashboardWidgets?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  baseCurrency?: string;
  preferences?: {
    locale?: string;
    theme?: 'light' | 'dark';
  };
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const userKeys = {
  me: ['user', 'me'] as const,
};

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: userKeys.me,
    queryFn: async () => {
      const res = await client.get<{ data: { user: UserProfile } }>('/users/me');
      return res.data.data.user;
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { setUser } = useAuthStore();
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const res = await client.patch<{ data: { user: UserProfile } }>('/users/me', payload);
      return res.data.data.user;
    },
    onSuccess: (user) => {
      if (!user) return;
      qc.setQueryData(userKeys.me, user);
      // Invalidate all cached data so screens re-render with the new baseCurrency/locale
      qc.invalidateQueries();
      setUser({
        id: user.id,
        email: user.email,
        name: user.name,
        baseCurrency: user.baseCurrency,
        preferences: user.preferences,
      });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const res = await client.patch<{ data: { message: string } }>('/users/me/password', payload);
      return res.data.data;
    },
  });
}
