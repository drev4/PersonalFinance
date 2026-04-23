import { apiClient } from '../lib/api';
import type {
  MortgageInputs,
  MortgageResult,
  LoanInputs,
  LoanResult,
  InvestmentInputs,
  InvestmentResult,
  EarlyRepaymentInputs,
  EarlyRepaymentResult,
  RetirementInputs,
  RetirementResult,
  SavedSimulation,
} from '../types/api';

// ─── Calculators ──────────────────────────────────────────────────────────────

export async function calculateMortgage(inputs: MortgageInputs): Promise<MortgageResult> {
  const payload = {
    ...inputs,
    principal: Math.round(inputs.principal * 100),
  };
  const response = await apiClient.post<{ data: MortgageResult }>(
    '/simulators/mortgage',
    payload,
  );
  return response.data.data;
}

export async function calculateLoan(inputs: LoanInputs): Promise<LoanResult> {
  const payload = {
    ...inputs,
    principal: Math.round(inputs.principal * 100),
    openingFee: inputs.openingFee !== undefined ? Math.round(inputs.openingFee * 100) : undefined,
    otherFees: inputs.otherFees !== undefined ? Math.round(inputs.otherFees * 100) : undefined,
  };
  const response = await apiClient.post<{ data: LoanResult }>(
    '/simulators/loan',
    payload,
  );
  return response.data.data;
}

export async function calculateInvestment(inputs: InvestmentInputs): Promise<InvestmentResult> {
  const payload = {
    ...inputs,
    initialAmount: Math.round(inputs.initialAmount * 100),
    monthlyContribution: Math.round(inputs.monthlyContribution * 100),
  };
  const response = await apiClient.post<{ data: InvestmentResult }>(
    '/simulators/investment',
    payload,
  );
  return response.data.data;
}

export async function calculateEarlyRepayment(
  inputs: EarlyRepaymentInputs,
): Promise<EarlyRepaymentResult> {
  const payload = {
    ...inputs,
    remainingPrincipal: Math.round(inputs.remainingPrincipal * 100),
    extraPayment: Math.round(inputs.extraPayment * 100),
  };
  const response = await apiClient.post<{ data: EarlyRepaymentResult }>(
    '/simulators/early-repayment',
    payload,
  );
  return response.data.data;
}

export async function calculateRetirement(inputs: RetirementInputs): Promise<RetirementResult> {
  const payload = {
    ...inputs,
    targetMonthlyIncome: Math.round(inputs.targetMonthlyIncome * 100),
    currentSavings: Math.round(inputs.currentSavings * 100),
  };
  const response = await apiClient.post<{ data: RetirementResult }>(
    '/simulators/retirement',
    payload,
  );
  return response.data.data;
}

// ─── Saved simulations ────────────────────────────────────────────────────────

export async function getSavedSimulations(type?: string): Promise<SavedSimulation[]> {
  const params = type ? { type } : undefined;
  const response = await apiClient.get<{ data: SavedSimulation[] }>('/simulations', {
    params,
  });
  return response.data.data;
}

export async function saveSimulation(
  type: string,
  name: string,
  inputs: unknown,
): Promise<SavedSimulation> {
  const response = await apiClient.post<{ data: SavedSimulation }>('/simulations', {
    type,
    name,
    inputs,
  });
  return response.data.data;
}

export async function deleteSimulation(id: string): Promise<void> {
  await apiClient.delete(`/simulations/${id}`);
}

export async function downloadSimulationPdf(id: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/simulations/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
}
