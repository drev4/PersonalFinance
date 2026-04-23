// User schemas and types
export { UserSchema, type User } from './schemas/user.schema';

// Account schemas and types
export { AccountSchema, AccountTypeEnum, type Account, type AccountType } from './schemas/account.schema';

// Transaction schemas and types
export {
  TransactionSchema,
  TransactionTypeEnum,
  RecurrenceFrequencyEnum,
  RecurringSchema,
  type Transaction,
  type TransactionType,
  type RecurrenceFrequency,
  type Recurring,
} from './schemas/transaction.schema';

// Category schemas and types
export { CategorySchema, type Category } from './schemas/category.schema';

// Category Rule schemas and types
export {
  CategoryRuleSchema,
  ConditionOperatorEnum,
  RuleConditionSchema,
  type CategoryRule,
  type ConditionOperator,
  type RuleCondition,
} from './schemas/categoryRule.schema';

// Budget schemas and types
export {
  BudgetSchema,
  BudgetPeriodEnum,
  type Budget,
  type BudgetPeriod,
} from './schemas/budget.schema';

// Holding schemas and types
export {
  HoldingSchema,
  AssetTypeEnum,
  type Holding,
  type AssetType,
} from './schemas/holding.schema';

// Integration credentials schemas and types
export {
  IntegrationCredentialsSchema,
  IntegrationTypeEnum,
  type IntegrationCredentials,
  type IntegrationType,
} from './schemas/integrationCredentials.schema';

// Simulation schemas and types
export {
  SimulationSchema,
  SimulationTypeEnum,
  SimulationResultSchema,
  SavingsGoalSimulationSchema,
  InvestmentReturnSimulationSchema,
  LoanPayoffSimulationSchema,
  CompoundInterestSimulationSchema,
  type Simulation,
  type SimulationType,
  type SimulationResult,
  type SavingsGoalSimulation,
  type InvestmentReturnSimulation,
  type LoanPayoffSimulation,
  type CompoundInterestSimulation,
} from './schemas/simulation.schema';

// Price snapshot schemas and types
export {
  PriceSnapshotSchema,
  type PriceSnapshot,
} from './schemas/priceSnapshot.schema';

// Net worth snapshot schemas and types
export {
  NetWorthSnapshotSchema,
  NetWorthComponentSchema,
  type NetWorthSnapshot,
  type NetWorthComponent,
} from './schemas/netWorthSnapshot.schema';

// Constants
export {
  CURRENCIES,
  SUPPORTED_EXCHANGES,
  DEFAULT_CATEGORIES,
} from './constants';
