import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  profilePicture: z.string().url('Invalid profile picture URL').optional(),
  baseCurrency: z.string().length(3, 'Currency code must be 3 characters').default('USD'),
  timezone: z.string().default('UTC'),
  language: z.enum(['en', 'es', 'fr', 'de', 'pt']).default('en'),
  notificationsEnabled: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
  isActive: z.boolean().default(true),
  twoFactorEnabled: z.boolean().default(false),
  lastLoginAt: z.date().optional(),
});

export type User = z.infer<typeof UserSchema>;
