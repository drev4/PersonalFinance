import mongoose from 'mongoose';
import { SimulationModel, type ISimulation, type SimulationType } from './simulation.model.js';
import { calculateMortgage, calculateMixedMortgage } from './calculators/mortgage.calculator.js';
import { calculateLoan } from './calculators/loan.calculator.js';
import { calculateInvestment } from './calculators/investment.calculator.js';
import { calculateEarlyRepayment } from './calculators/earlyRepayment.calculator.js';
import { calculateRetirement } from './calculators/retirement.calculator.js';
import { generateSimulationPdf } from './pdf.generator.js';
import {
  MortgageSchema,
  MixedMortgageSchema,
  LoanSchema,
  InvestmentSchema,
  EarlyRepaymentSchema,
  RetirementSchema,
} from './simulator.schemas.js';

// ---- Error class ------------------------------------------------------------

export class SimulatorError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'SimulatorError';
  }
}

// ---- Result union type ------------------------------------------------------

type SimulationResult = ReturnType<typeof calculateMortgage>
  | ReturnType<typeof calculateLoan>
  | ReturnType<typeof calculateInvestment>
  | ReturnType<typeof calculateEarlyRepayment>
  | ReturnType<typeof calculateRetirement>;

// ---- Calculation dispatcher -------------------------------------------------

/**
 * Validates inputs with Zod and dispatches to the correct calculator.
 * Pure: no DB interaction.
 */
export function calculate(type: SimulationType, inputs: unknown): SimulationResult {
  switch (type) {
    case 'mortgage': {
      // Use mixed calculator when fixedYears and variableRate are present
      const raw = inputs as Record<string, unknown>;
      if (raw['fixedYears'] !== undefined && raw['variableRate'] !== undefined) {
        const parsed = MixedMortgageSchema.parse(inputs);
        return calculateMixedMortgage(parsed);
      }
      const parsed = MortgageSchema.parse(inputs);
      return calculateMortgage(parsed);
    }

    case 'loan': {
      const parsed = LoanSchema.parse(inputs);
      return calculateLoan(parsed);
    }

    case 'investment': {
      const parsed = InvestmentSchema.parse(inputs);
      return calculateInvestment(parsed);
    }

    case 'early_repayment': {
      const parsed = EarlyRepaymentSchema.parse(inputs);
      return calculateEarlyRepayment(parsed);
    }

    case 'retirement': {
      const parsed = RetirementSchema.parse(inputs);
      return calculateRetirement(parsed);
    }

    default: {
      throw new SimulatorError('UNKNOWN_TYPE', `Unknown simulation type: ${String(type)}`, 400);
    }
  }
}

// ---- Persistence operations -------------------------------------------------

/**
 * Calculates and persists a simulation for the authenticated user.
 */
export async function saveSimulation(
  userId: string,
  type: SimulationType,
  name: string,
  inputs: unknown,
): Promise<ISimulation> {
  const results = calculate(type, inputs);

  const simulation = await SimulationModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    type,
    name,
    inputs,
    results,
  });

  return simulation;
}

/**
 * Returns all saved simulations for a user, optionally filtered by type.
 * Sorted by createdAt descending (newest first).
 */
export async function getUserSimulations(
  userId: string,
  type?: SimulationType,
): Promise<ISimulation[]> {
  const query: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(userId),
  };
  if (type !== undefined) {
    query['type'] = type;
  }
  return SimulationModel.find(query).sort({ createdAt: -1 }).lean<ISimulation[]>().exec();
}

/**
 * Returns a single simulation owned by the user.
 * Throws 404 if not found or not owned by the user.
 */
export async function getSimulation(
  userId: string,
  simulationId: string,
): Promise<ISimulation> {
  if (!mongoose.Types.ObjectId.isValid(simulationId)) {
    throw new SimulatorError('SIMULATION_NOT_FOUND', 'Simulation not found', 404);
  }

  const simulation = await SimulationModel.findOne({
    _id: new mongoose.Types.ObjectId(simulationId),
    userId: new mongoose.Types.ObjectId(userId),
  })
    .lean<ISimulation>()
    .exec();

  if (simulation === null) {
    throw new SimulatorError('SIMULATION_NOT_FOUND', 'Simulation not found', 404);
  }

  return simulation;
}

/**
 * Hard-deletes a simulation owned by the user.
 */
export async function deleteSimulation(
  userId: string,
  simulationId: string,
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(simulationId)) {
    throw new SimulatorError('SIMULATION_NOT_FOUND', 'Simulation not found', 404);
  }

  const result = await SimulationModel.deleteOne({
    _id: new mongoose.Types.ObjectId(simulationId),
    userId: new mongoose.Types.ObjectId(userId),
  }).exec();

  if (result.deletedCount === 0) {
    throw new SimulatorError('SIMULATION_NOT_FOUND', 'Simulation not found', 404);
  }
}

/**
 * Generates a PDF buffer for a saved simulation.
 */
export async function generatePdf(
  userId: string,
  simulationId: string,
): Promise<Buffer> {
  const simulation = await getSimulation(userId, simulationId);
  return generateSimulationPdf(simulation);
}
