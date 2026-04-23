import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import {
  calculateMortgage,
  calculateLoan,
  calculateInvestment,
  calculateEarlyRepayment,
  calculateRetirement,
  getSavedSimulations,
  saveSimulation,
  deleteSimulation,
} from '../api/simulators.api';
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

// ─── Query keys ───────────────────────────────────────────────────────────────

export const simulatorKeys = {
  all: ['simulators'] as const,
  saved: () => [...simulatorKeys.all, 'saved'] as const,
  savedByType: (type?: string) => [...simulatorKeys.saved(), type] as const,
};

// ─── Calculators — use mutations so they fire on demand ───────────────────────

export function useCalculateMortgage(): UseMutationResult<
  MortgageResult,
  Error,
  MortgageInputs
> {
  return useMutation({
    mutationFn: calculateMortgage,
  });
}

export function useCalculateLoan(): UseMutationResult<LoanResult, Error, LoanInputs> {
  return useMutation({
    mutationFn: calculateLoan,
  });
}

export function useCalculateInvestment(): UseMutationResult<
  InvestmentResult,
  Error,
  InvestmentInputs
> {
  return useMutation({
    mutationFn: calculateInvestment,
  });
}

export function useCalculateEarlyRepayment(): UseMutationResult<
  EarlyRepaymentResult,
  Error,
  EarlyRepaymentInputs
> {
  return useMutation({
    mutationFn: calculateEarlyRepayment,
  });
}

export function useCalculateRetirement(): UseMutationResult<
  RetirementResult,
  Error,
  RetirementInputs
> {
  return useMutation({
    mutationFn: calculateRetirement,
  });
}

// ─── Saved simulations ────────────────────────────────────────────────────────

export function useSavedSimulations(type?: string): UseQueryResult<SavedSimulation[]> {
  return useQuery({
    queryKey: simulatorKeys.savedByType(type),
    queryFn: () => getSavedSimulations(type),
    staleTime: 1000 * 60 * 2,
  });
}

export function useSaveSimulation(): UseMutationResult<
  SavedSimulation,
  Error,
  { type: string; name: string; inputs: unknown }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, name, inputs }) => saveSimulation(type, name, inputs),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: simulatorKeys.saved() });
    },
  });
}

export function useDeleteSimulation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSimulation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: simulatorKeys.saved() });
    },
  });
}
