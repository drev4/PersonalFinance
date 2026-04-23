/**
 * id-generator.ts
 *
 * Generates collision-resistant temporary client IDs without external deps.
 * Uses Math.random() + timestamp — sufficient for optimistic update keys
 * since they are replaced by server IDs after confirmation.
 *
 * Format: "tmp_<timestamp>_<random hex>"
 * Example: "tmp_1714060800000_3f9a2c"
 */

export function generateClientId(): string {
  const ts = Date.now().toString();
  const random = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `tmp_${ts}_${random}`;
}
