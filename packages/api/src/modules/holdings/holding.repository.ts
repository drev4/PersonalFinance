import mongoose from 'mongoose';
import { HoldingModel, type IHolding, type AssetType, type HoldingSource } from './holding.model.js';

export interface CreateHoldingDTO {
  userId: string;
  accountId: string;
  assetType: AssetType;
  symbol: string;
  exchange?: string;
  quantity: string;
  averageBuyPrice: number;
  currency: string;
  currentPrice?: number;
  priceUpdatedAt?: Date;
  source: HoldingSource;
  externalId?: string;
}

export interface UpdateHoldingDTO {
  accountId?: string;
  assetType?: AssetType;
  symbol?: string;
  exchange?: string;
  quantity?: string;
  averageBuyPrice?: number;
  currency?: string;
  currentPrice?: number;
  priceUpdatedAt?: Date;
  source?: HoldingSource;
  externalId?: string;
}

export async function findByUser(userId: string): Promise<IHolding[]> {
  // `.lean()` returns plain JS objects — much cheaper to hydrate than full
  // Mongoose documents. Holdings are enriched with computed fields before
  // being serialized back to the client, so we never need the full doc API.
  return HoldingModel.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ symbol: 1 })
    .lean<IHolding[]>()
    .exec();
}

export async function findById(
  id: string,
  userId: string,
): Promise<IHolding | null> {
  return HoldingModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).exec();
}

export async function findBySymbol(
  userId: string,
  symbol: string,
): Promise<IHolding | null> {
  return HoldingModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    symbol: symbol.toUpperCase(),
  }).exec();
}

export async function create(data: CreateHoldingDTO): Promise<IHolding> {
  const holding = new HoldingModel({
    userId: new mongoose.Types.ObjectId(data.userId),
    accountId: new mongoose.Types.ObjectId(data.accountId),
    assetType: data.assetType,
    symbol: data.symbol.toUpperCase(),
    exchange: data.exchange,
    quantity: data.quantity,
    averageBuyPrice: data.averageBuyPrice,
    currency: data.currency.toUpperCase(),
    currentPrice: data.currentPrice,
    priceUpdatedAt: data.priceUpdatedAt,
    source: data.source,
    externalId: data.externalId,
  });
  return holding.save();
}

export async function createMany(data: CreateHoldingDTO[]): Promise<IHolding[]> {
  const docs = data.map((d) => ({
    userId: new mongoose.Types.ObjectId(d.userId),
    accountId: new mongoose.Types.ObjectId(d.accountId),
    assetType: d.assetType,
    symbol: d.symbol.toUpperCase(),
    exchange: d.exchange,
    quantity: d.quantity,
    averageBuyPrice: d.averageBuyPrice,
    currency: d.currency.toUpperCase(),
    currentPrice: d.currentPrice,
    priceUpdatedAt: d.priceUpdatedAt,
    source: d.source,
    externalId: d.externalId,
  }));
  return HoldingModel.insertMany(docs);
}

export async function update(
  id: string,
  userId: string,
  data: Partial<UpdateHoldingDTO>,
): Promise<IHolding | null> {
  const updatePayload: Record<string, unknown> = {};

  if (data.accountId !== undefined) {
    updatePayload['accountId'] = new mongoose.Types.ObjectId(data.accountId);
  }
  if (data.assetType !== undefined) updatePayload['assetType'] = data.assetType;
  if (data.symbol !== undefined) updatePayload['symbol'] = data.symbol.toUpperCase();
  if (data.exchange !== undefined) updatePayload['exchange'] = data.exchange;
  if (data.quantity !== undefined) updatePayload['quantity'] = data.quantity;
  if (data.averageBuyPrice !== undefined) updatePayload['averageBuyPrice'] = data.averageBuyPrice;
  if (data.currency !== undefined) updatePayload['currency'] = data.currency.toUpperCase();
  if (data.currentPrice !== undefined) updatePayload['currentPrice'] = data.currentPrice;
  if (data.priceUpdatedAt !== undefined) updatePayload['priceUpdatedAt'] = data.priceUpdatedAt;
  if (data.source !== undefined) updatePayload['source'] = data.source;
  if (data.externalId !== undefined) updatePayload['externalId'] = data.externalId;

  return HoldingModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    },
    { $set: updatePayload },
    { new: true, runValidators: true },
  ).exec();
}

/**
 * Updates currentPrice and priceUpdatedAt for ALL holdings with the given symbol
 * across ALL users. Used by price-update background jobs.
 */
export async function updatePrice(
  symbol: string,
  price: number,
  _source: string,
): Promise<void> {
  await HoldingModel.updateMany(
    { symbol: symbol.toUpperCase() },
    {
      $set: {
        currentPrice: price,
        priceUpdatedAt: new Date(),
      },
    },
  ).exec();
}

export async function deleteHolding(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await HoldingModel.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).exec();
  return result !== null;
}

/**
 * Returns a deduplicated list of symbols for holdings of a specific asset type.
 * Used by price-update jobs to know which symbols to fetch.
 */
export async function getUniqueSymbolsByType(assetType: AssetType): Promise<string[]> {
  const results = await HoldingModel.distinct('symbol', { assetType }).exec() as string[];
  return results;
}
