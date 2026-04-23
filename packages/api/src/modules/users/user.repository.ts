import type { IUser, IUserPreferences } from './user.model.js';
import { UserModel } from './user.model.js';

export interface CreateUserDTO {
  email: string;
  passwordHash: string;
  name: string;
  baseCurrency?: string;
  role?: 'user' | 'admin';
}

export interface UpdateUserDTO {
  name: string;
  baseCurrency: string;
  preferences: Partial<IUserPreferences>;
}

export async function findByEmail(email: string): Promise<IUser | null> {
  return UserModel.findOne({ email: email.toLowerCase() }).exec();
}

export async function findById(id: string): Promise<IUser | null> {
  return UserModel.findById(id).exec();
}

export async function createUser(data: CreateUserDTO): Promise<IUser> {
  const user = new UserModel({
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    baseCurrency: data.baseCurrency ?? 'EUR',
    role: data.role ?? 'user',
  });
  return user.save();
}

export async function updateUser(
  id: string,
  data: Partial<UpdateUserDTO>,
): Promise<IUser | null> {
  const updatePayload: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updatePayload['name'] = data.name;
  }
  if (data.baseCurrency !== undefined) {
    updatePayload['baseCurrency'] = data.baseCurrency;
  }
  if (data.preferences !== undefined) {
    // Merge preferences using dot notation to avoid overwriting unspecified fields
    for (const [key, value] of Object.entries(data.preferences)) {
      updatePayload[`preferences.${key}`] = value;
    }
  }

  return UserModel.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true, runValidators: true },
  ).exec();
}

export async function updateLastLogin(id: string): Promise<void> {
  await UserModel.findByIdAndUpdate(id, { $set: { lastLoginAt: new Date() } }).exec();
}

export async function updatePasswordHash(id: string, passwordHash: string): Promise<void> {
  await UserModel.findByIdAndUpdate(id, { $set: { passwordHash } }).exec();
}

export async function markEmailVerified(id: string): Promise<void> {
  await UserModel.findByIdAndUpdate(
    id,
    { $set: { emailVerified: true } },
  ).exec();
}
