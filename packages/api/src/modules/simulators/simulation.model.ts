import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---- Types ------------------------------------------------------------------

export type SimulationType =
  | 'mortgage'
  | 'loan'
  | 'investment'
  | 'early_repayment'
  | 'retirement';

export interface ISimulation extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: SimulationType;
  name: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  createdAt: Date;
}

// ---- Schema -----------------------------------------------------------------

const SimulationSchema = new Schema<ISimulation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['mortgage', 'loan', 'investment', 'early_repayment', 'retirement'] as SimulationType[],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    inputs: {
      type: Schema.Types.Mixed,
      required: true,
    },
    results: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    // Only createdAt — simulations are never edited, new ones are created
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

SimulationSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const SimulationModel: Model<ISimulation> = mongoose.model<ISimulation>(
  'Simulation',
  SimulationSchema,
);
