// ─── User ────────────────────────────────────────────────────────────────────

export interface SafeUser {
  _id: string;
  email: string;
  name: string;
  baseCurrency: string;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  preferences: {
    locale: string;
    theme: 'light' | 'dark';
    dashboardWidgets: string[];
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export type AccountType =
  | 'checking'
  | 'savings'
  | 'cash'
  | 'credit_card'
  | 'real_estate'
  | 'vehicle'
  | 'loan'
  | 'mortgage'
  | 'crypto'
  | 'investment'
  | 'other';

export interface Account {
  _id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: string;
  currentBalance: number;
  initialBalance: number;
  institution?: string;
  notes?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  includedInNetWorth: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment';

export interface TransactionRecurring {
  nextDate: string;
  frequency: string;
}

export interface Transaction {
  _id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  description: string;
  categoryId?: string;
  tags: string[];
  transferToAccountId?: string;
  source: string;
  externalId?: string;
  recurring?: TransactionRecurring;
  createdAt: string;
  updatedAt: string;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export interface Category {
  _id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  parentId?: string;
  color: string;
  icon: string;
  isDefault: boolean;
  isActive: boolean;
}

// ─── Generic responses ────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data: T;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateAccountDTO {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
  institution?: string;
  notes?: string;
  color?: string;
  includedInNetWorth?: boolean;
}

export type UpdateAccountDTO = Partial<CreateAccountDTO>;

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransactionDTO {
  accountId: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  date: string;
  description: string;
  categoryId?: string;
  tags?: string[];
  notes?: string;
}

export type UpdateTransactionDTO = Partial<CreateTransactionDTO>;

export interface CreateTransferDTO {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description: string;
}

export interface CreateCategoryDTO {
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  parentId?: string;
}

export type UpdateCategoryDTO = Partial<CreateCategoryDTO>;

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  color: string;
  total: number;
}

export interface CashflowData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface NetWorthData {
  totalBalance: number;
  byType: Record<string, number>;
}

// ─── Dashboard v1 ─────────────────────────────────────────────────────────────

export interface NetWorthBreakdown {
  cash: number;
  investments: number;
  realEstate: number;
  vehicles: number;
  debts: number;
}

export interface NetWorthSummary {
  total: number;
  assets: number;
  liabilities: number;
  breakdown: NetWorthBreakdown;
  currency: string;
}

export interface NetWorthPoint {
  date: string;
  total: number;
  breakdown: NetWorthBreakdown;
}

export interface CashflowMonth {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface CategorySpendingItem {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  percentage: number;
}

export type NetWorthHistoryPeriod = '1m' | '3m' | '6m' | '1y' | 'all';

// ─── Budgets ──────────────────────────────────────────────────────────────────

export interface BudgetItem {
  categoryId: string;
  amount: number;
}

export interface Budget {
  _id: string;
  userId: string;
  name: string;
  period: 'monthly' | 'yearly';
  startDate: string;
  items: BudgetItem[];
  rollover: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItemProgress {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export interface BudgetProgress {
  budgetId: string;
  name: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  totalBudgeted: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  items: BudgetItemProgress[];
}

export interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  categoryName: string;
  percentageUsed: number;
  status: 'warning' | 'exceeded';
}

export interface CreateBudgetDTO {
  name: string;
  period: 'monthly' | 'yearly';
  startDate: string;
  items: BudgetItem[];
  rollover: boolean;
}

export type UpdateBudgetDTO = Partial<CreateBudgetDTO>;

// ─── Goals ────────────────────────────────────────────────────────────────────

export interface Goal {
  _id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  linkedAccountId?: string;
  color?: string;
  icon?: string;
  isCompleted: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalDTO {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  linkedAccountId?: string;
  color?: string;
  icon?: string;
}

export type UpdateGoalDTO = Partial<CreateGoalDTO>;

// ─── Holdings ─────────────────────────────────────────────────────────────────

export type AssetType = 'crypto' | 'stock' | 'etf' | 'bond';
export type HoldingSource = 'manual' | 'binance' | 'csv_import';

export interface Holding {
  _id: string;
  userId: string;
  accountId: string;
  assetType: AssetType;
  symbol: string;
  exchange?: string;
  quantity: string;
  averageBuyPrice: number;
  currency: string;
  currentPrice?: number;
  priceUpdatedAt?: string;
  source: HoldingSource;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HoldingWithValue extends Holding {
  currentValue: number;
  totalCost: number;
  pnl: number;
  pnlPercentage: number;
  portfolioPercentage: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercentage: number;
  byAssetType: { type: AssetType; value: number; percentage: number }[];
  topHoldings: HoldingWithValue[];
}

export interface TickerSearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

export interface CreateHoldingDTO {
  accountId: string;
  assetType: AssetType;
  symbol: string;
  exchange?: string;
  quantity: string;
  averageBuyPrice: number;
  currency: string;
}

export interface UpdateHoldingDTO {
  accountId?: string;
  quantity?: string;
  averageBuyPrice?: number;
}

// ─── Simulators — Inputs ──────────────────────────────────────────────────────

export interface MortgageInputs {
  principal: number;
  annualRate: number;
  years: number;
  fixedYears?: number;
  variableRate?: number;
}

export interface LoanInputs {
  principal: number;
  annualRate: number;
  months: number;
  openingFee?: number;
  otherFees?: number;
}

export interface InvestmentInputs {
  initialAmount: number;
  monthlyContribution: number;
  annualReturn: number;
  years: number;
  inflationRate?: number;
}

export interface EarlyRepaymentInputs {
  remainingPrincipal: number;
  currentRate: number;
  remainingMonths: number;
  extraPayment: number;
  strategy: 'reduce_quota' | 'reduce_term';
}

export interface RetirementInputs {
  currentAge: number;
  retirementAge: number;
  targetMonthlyIncome: number;
  currentSavings: number;
  expectedReturn: number;
  inflationRate: number;
  lifeExpectancy: number;
}

// ─── Simulators — Results ─────────────────────────────────────────────────────

export interface AmortizationRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
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

export interface LoanResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  tin: number;
  tae: number;
  schedule: AmortizationRow[];
}

export interface YearlyProjection {
  year: number;
  contributed: number;
  returns: number;
  total: number;
  realValue?: number;
}

export interface InvestmentScenario {
  finalValue: number;
  totalContributed: number;
  totalReturns: number;
  realFinalValue?: number;
  annualProjection: YearlyProjection[];
}

export interface InvestmentResult extends InvestmentScenario {
  scenarios: {
    conservative: InvestmentScenario;
    base: InvestmentScenario;
    optimistic: InvestmentScenario;
  } | null;
}

export interface EarlyRepaymentResult {
  originalSchedule: {
    monthlyPayment: number;
    totalInterest: number;
    totalPayment: number;
    remainingMonths: number;
  };
  newSchedule: {
    monthlyPayment: number;
    totalInterest: number;
    totalPayment: number;
    remainingMonths: number;
  };
  savings: {
    interest: number;
    months: number;
    totalPayment: number;
  };
}

export interface RetirementResult {
  requiredNestEgg: number;
  monthlySavingsNeeded: number;
  yearsToRetirement: number;
  projectedNestEgg: number;
  shortfall: number;
  annualProjection: YearlyProjection[];
}

export interface SavedSimulation {
  _id: string;
  userId: string;
  type: string;
  name: string;
  inputs: unknown;
  results: unknown;
  createdAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'recurring_due'
  | 'sync_error'
  | 'price_alert'
  | 'goal_reached'
  | 'report_ready';

export interface AppNotification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCount {
  count: number;
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export type IntegrationProvider = 'binance' | 'coinmarketcap' | 'finnhub';

export type SyncStatus = 'success' | 'error' | 'pending' | 'never';

export interface IntegrationStatus {
  provider: IntegrationProvider;
  connected: boolean;
  lastSyncAt?: string;
  lastSyncStatus: SyncStatus;
  lastSyncError?: string;
}
