import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IGoal extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  targetAmount: number;    // in cents
  currentAmount: number;   // in cents
  deadline?: Date;
  linkedAccountId?: mongoose.Types.ObjectId;
  color?: string;
  icon?: string;
  isCompleted: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    currentAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    deadline: {
      type: Date,
      default: undefined,
    },
    linkedAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      default: undefined,
    },
    color: {
      type: String,
      trim: true,
      default: undefined,
    },
    icon: {
      type: String,
      trim: true,
      default: undefined,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

GoalSchema.index({ userId: 1, isActive: 1, isCompleted: 1 });
// Supports "recently updated goals" lists, optionally filtered by completion.
GoalSchema.index({ userId: 1, isCompleted: 1, updatedAt: -1 });

export const GoalModel: Model<IGoal> = mongoose.model<IGoal>(
  'Goal',
  GoalSchema,
);
