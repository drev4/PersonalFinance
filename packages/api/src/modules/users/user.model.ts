import mongoose, { Schema, type Document, type Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserPreferences {
  locale: string;
  theme: 'light' | 'dark';
  dashboardWidgets: string[];
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  baseCurrency: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    locale: { type: String, default: 'es-ES' },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    dashboardWidgets: { type: [String], default: [] },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    baseCurrency: {
      type: String,
      default: 'EUR',
      uppercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    preferences: {
      type: UserPreferencesSchema,
      default: () => ({
        locale: 'es-ES',
        theme: 'light',
        dashboardWidgets: [],
      }),
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

UserSchema.methods['comparePassword'] = async function (
  this: IUser,
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

// Prevent passwordHash from appearing in JSON serialization by default
UserSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret['passwordHash'];
    delete ret['twoFactorSecret'];
    return ret;
  },
});

export const UserModel: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
