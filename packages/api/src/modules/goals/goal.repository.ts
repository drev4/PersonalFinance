import mongoose from 'mongoose';
import { GoalModel, type IGoal } from './goal.model.js';

export interface CreateGoalDTO {
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: Date;
  linkedAccountId?: string;
  color?: string;
  icon?: string;
}

export interface UpdateGoalDTO {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: Date;
  linkedAccountId?: string;
  color?: string;
  icon?: string;
  isCompleted?: boolean;
}

// Active goals + completed goals from the last 30 days
export async function findByUser(userId: string): Promise<IGoal[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return GoalModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
    $or: [
      { isCompleted: false },
      { isCompleted: true, updatedAt: { $gte: thirtyDaysAgo } },
    ],
  })
    .sort({ createdAt: -1 })
    .exec();
}

export async function findById(
  id: string,
  userId: string,
): Promise<IGoal | null> {
  return GoalModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
  }).exec();
}

export async function create(data: CreateGoalDTO): Promise<IGoal> {
  const goal = new GoalModel({
    userId: new mongoose.Types.ObjectId(data.userId),
    name: data.name,
    targetAmount: data.targetAmount,
    currentAmount: data.currentAmount ?? 0,
    deadline: data.deadline,
    linkedAccountId:
      data.linkedAccountId !== undefined
        ? new mongoose.Types.ObjectId(data.linkedAccountId)
        : undefined,
    color: data.color,
    icon: data.icon,
    isCompleted: false,
    isActive: true,
  });
  return goal.save();
}

export async function update(
  id: string,
  userId: string,
  data: Partial<UpdateGoalDTO>,
): Promise<IGoal | null> {
  const updatePayload: Record<string, unknown> = {};

  if (data.name !== undefined) updatePayload['name'] = data.name;
  if (data.targetAmount !== undefined) updatePayload['targetAmount'] = data.targetAmount;
  if (data.currentAmount !== undefined) updatePayload['currentAmount'] = data.currentAmount;
  if (data.deadline !== undefined) updatePayload['deadline'] = data.deadline;
  if (data.linkedAccountId !== undefined) {
    updatePayload['linkedAccountId'] = new mongoose.Types.ObjectId(data.linkedAccountId);
  }
  if (data.color !== undefined) updatePayload['color'] = data.color;
  if (data.icon !== undefined) updatePayload['icon'] = data.icon;
  if (data.isCompleted !== undefined) updatePayload['isCompleted'] = data.isCompleted;

  return GoalModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    },
    { $set: updatePayload },
    { new: true, runValidators: true },
  ).exec();
}

export async function deactivate(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await GoalModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    },
    { $set: { isActive: false } },
  ).exec();
  return result !== null;
}
