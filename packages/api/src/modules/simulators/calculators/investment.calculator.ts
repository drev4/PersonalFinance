// ---- Types ------------------------------------------------------------------

export interface InvestmentInputs {
  initialAmount: number;        // céntimos
  monthlyContribution: number;  // céntimos
  annualReturn: number;         // % anual
  years: number;
  inflationRate?: number;       // % anual, para valor real
}

export interface YearlyProjection {
  year: number;
  contributed: number;    // total aportado hasta este año, céntimos
  returns: number;        // rendimientos acumulados, céntimos
  total: number;          // valor total, céntimos
  realValue?: number;     // ajustado por inflación, céntimos
}

export interface InvestmentResult {
  finalValue: number;
  totalContributed: number;
  totalReturns: number;
  realFinalValue?: number;
  annualProjection: YearlyProjection[];
  scenarios: {
    conservative: InvestmentResult;
    base: InvestmentResult;
    optimistic: InvestmentResult;
  } | null;
}

// ---- Internal helpers -------------------------------------------------------

/**
 * Computes a single InvestmentResult without recursive scenarios.
 * All amounts in cents (integers).
 *
 * FV without contributions:  PV * (1 + r)^t
 * FV with contributions:     PV*(1+r)^t + PMT * ((1+r)^t - 1) / r
 * r = monthly rate = annualReturn / 12 / 100
 */
function computeInvestment(inputs: InvestmentInputs): InvestmentResult {
  const { initialAmount, monthlyContribution, annualReturn, years, inflationRate } = inputs;

  const monthlyRate = annualReturn / 12 / 100;
  const annualProjection: YearlyProjection[] = [];

  let currentValue = initialAmount;
  const totalContributed_final = initialAmount + monthlyContribution * years * 12;

  for (let year = 1; year <= years; year++) {
    const months = year * 12;

    // Future value of the initial lump sum
    const fvInitial = Math.round(initialAmount * Math.pow(1 + monthlyRate, months));

    // Future value of monthly contributions (annuity)
    let fvContributions: number;
    if (monthlyRate === 0) {
      fvContributions = monthlyContribution * months;
    } else {
      fvContributions = Math.round(
        monthlyContribution * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate,
      );
    }

    const total = fvInitial + fvContributions;
    const contributed = initialAmount + monthlyContribution * months;
    const returns = total - contributed;

    let realValue: number | undefined;
    if (inflationRate !== undefined) {
      const inflationFactor = Math.pow(1 + inflationRate / 100, year);
      realValue = Math.round(total / inflationFactor);
    }

    annualProjection.push({
      year,
      contributed,
      returns,
      total,
      realValue,
    });

    if (year === years) {
      currentValue = total;
    }
  }

  const finalValue = currentValue;
  const totalContributed = initialAmount + monthlyContribution * years * 12;
  const totalReturns = finalValue - totalContributed;

  let realFinalValue: number | undefined;
  if (inflationRate !== undefined) {
    const inflationFactor = Math.pow(1 + inflationRate / 100, years);
    realFinalValue = Math.round(finalValue / inflationFactor);
  }

  return {
    finalValue,
    totalContributed,
    totalReturns,
    realFinalValue,
    annualProjection,
    scenarios: null,
  };
}

// ---- Public API -------------------------------------------------------------

/**
 * Calculates investment growth with compound interest.
 * When includeScenarios is true (default), also computes conservative
 * (annualReturn - 2%) and optimistic (annualReturn + 2%) scenarios.
 */
export function calculateInvestment(
  inputs: InvestmentInputs,
  includeScenarios: boolean = true,
): InvestmentResult {
  const base = computeInvestment(inputs);

  if (!includeScenarios) {
    return base;
  }

  const conservativeRate = Math.max(0, inputs.annualReturn - 2);
  const optimisticRate = inputs.annualReturn + 2;

  const conservative = computeInvestment({ ...inputs, annualReturn: conservativeRate });
  const optimistic = computeInvestment({ ...inputs, annualReturn: optimisticRate });

  return {
    ...base,
    scenarios: {
      conservative,
      base,
      optimistic,
    },
  };
}
