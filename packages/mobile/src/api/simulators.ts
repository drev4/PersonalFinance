import { useMutation } from '@tanstack/react-query';
import client from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AmortizationRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface MortgageInputs {
  principal: number;
  annualRate: number;
  years: number;
  fixedYears?: number;
  variableRate?: number;
}

export interface MortgageResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  effectiveRate: number;
  schedule: AmortizationRow[];
  fixedPhasePayment?: number;
  variablePhasePayment?: number;
}

export interface InvestmentInputs {
  initialAmount: number;
  monthlyContribution: number;
  annualReturn: number;
  years: number;
  inflationRate?: number;
}

export interface YearlyProjection {
  year: number;
  contributed: number;
  returns: number;
  total: number;
  realValue?: number;
}

export interface InvestmentResult {
  finalValue: number;
  totalContributed: number;
  totalReturns: number;
  realFinalValue?: number;
  annualProjection: YearlyProjection[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useCalculateMortgage = () =>
  useMutation({
    mutationFn: async (inputs: MortgageInputs): Promise<MortgageResult> => {
      const payload = { ...inputs, principal: Math.round(inputs.principal * 100) };
      const res = await client.post<{ data: MortgageResult }>('/simulators/mortgage', payload);
      return res.data.data;
    },
  });

export const useCalculateInvestment = () =>
  useMutation({
    mutationFn: async (inputs: InvestmentInputs): Promise<InvestmentResult> => {
      const payload = {
        ...inputs,
        initialAmount: Math.round(inputs.initialAmount * 100),
        monthlyContribution: Math.round(inputs.monthlyContribution * 100),
      };
      const res = await client.post<{ data: InvestmentResult }>('/simulators/investment', payload);
      return res.data.data;
    },
  });
