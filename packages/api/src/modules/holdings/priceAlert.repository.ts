import mongoose from 'mongoose';
import { PriceAlertModel, type IPriceAlert } from './priceAlert.model.js';

export interface CreateAlertDTO {
  userId: string;
  holdingId: string;
  symbol: string;
  assetType: string;
  condition: 'above' | 'below';
  targetPrice: number;
  currency: string;
}

export async function createAlert(dto: CreateAlertDTO): Promise<IPriceAlert> {
  return PriceAlertModel.create({
    userId: new mongoose.Types.ObjectId(dto.userId),
    holdingId: new mongoose.Types.ObjectId(dto.holdingId),
    symbol: dto.symbol.toUpperCase(),
    assetType: dto.assetType,
    condition: dto.condition,
    targetPrice: dto.targetPrice,
    currency: dto.currency,
    isActive: true,
  });
}

export async function findByUser(userId: string): Promise<IPriceAlert[]> {
  return PriceAlertModel.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
}

export async function findByHolding(userId: string, holdingId: string): Promise<IPriceAlert[]> {
  return PriceAlertModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    holdingId: new mongoose.Types.ObjectId(holdingId),
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
}

export async function findAllActive(): Promise<IPriceAlert[]> {
  return PriceAlertModel.find({ isActive: true }).lean().exec();
}

export async function findById(id: string, userId: string): Promise<IPriceAlert | null> {
  return PriceAlertModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).exec();
}

export async function deleteAlert(id: string, userId: string): Promise<boolean> {
  const result = await PriceAlertModel.deleteOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).exec();
  return result.deletedCount > 0;
}

export async function toggleAlert(id: string, userId: string): Promise<IPriceAlert | null> {
  const alert = await PriceAlertModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).exec();
  if (!alert) return null;
  alert.isActive = !alert.isActive;
  if (alert.isActive) alert.triggeredAt = undefined;
  return alert.save();
}

export async function markTriggered(id: string): Promise<void> {
  await PriceAlertModel.updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { $set: { isActive: false, triggeredAt: new Date() } },
  ).exec();
}
