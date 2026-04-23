/**
 * offline-queue.ts
 *
 * Persists pending mutation payloads in MMKV so they survive app restarts.
 * The sync logic is triggered by useCreateTransaction when connectivity
 * is restored.
 *
 * Queue format: a JSON array of QueuedMutation objects stored under a
 * single MMKV key.
 */

import { storage } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueuedMutation {
  clientId: string;
  payload: Record<string, unknown>;
  enqueuedAt: number;
  retries: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUEUE_KEY = 'offline_mutation_queue_v1';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readQueue(): QueuedMutation[] {
  const raw = storage.getString(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedMutation[]): void {
  storage.set(QUEUE_KEY, JSON.stringify(queue));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Append a mutation to the offline queue */
export function enqueueOfflineMutation(
  clientId: string,
  payload: Record<string, unknown>,
): void {
  const queue = readQueue();
  queue.push({ clientId, payload, enqueuedAt: Date.now(), retries: 0 });
  writeQueue(queue);
}

/** Remove a mutation from the queue by clientId (after successful sync) */
export function dequeueOfflineMutation(clientId: string): void {
  const queue = readQueue().filter((m) => m.clientId !== clientId);
  writeQueue(queue);
}

/** Return all pending mutations sorted oldest-first */
export function getPendingMutations(): QueuedMutation[] {
  return readQueue().sort((a, b) => a.enqueuedAt - b.enqueuedAt);
}

/** Increment retry counter for a given clientId */
export function incrementRetryCount(clientId: string): void {
  const queue = readQueue().map((m) =>
    m.clientId === clientId ? { ...m, retries: m.retries + 1 } : m,
  );
  writeQueue(queue);
}

/** Clear the entire queue (e.g. on logout) */
export function clearOfflineQueue(): void {
  storage.delete(QUEUE_KEY);
}
