/**
 * Smoke test: validates that @finanzas/shared types are accessible from mobile.
 * Run: npx ts-node --project tsconfig.json src/lib/shared-test.ts
 * (or just verify this file has no TS errors via `pnpm typecheck`)
 */
import type { Account, Transaction, User } from '@finanzas/shared';

// Verify workspace link works: if this compiles, the path alias is correct.
// We use satisfies to check type compatibility without unused-var warnings.
const _check = {
  account: undefined as unknown as Account,
  transaction: undefined as unknown as Transaction,
  user: undefined as unknown as User,
};

// Suppress unused variable warning on _check
export type { Account, Transaction, User };
export const SHARED_IMPORT_OK: boolean = typeof _check !== 'undefined';
