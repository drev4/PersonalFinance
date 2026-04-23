/**
 * note-suggester.ts
 *
 * Lightweight regex-based category suggestion from free-text notes.
 * This runs entirely on-device with no network calls.
 *
 * Returns the suggested categoryName or null if no match is confident enough.
 */

// ─── Rule set ─────────────────────────────────────────────────────────────────

interface SuggestionRule {
  pattern: RegExp;
  categoryName: string;
}

const RULES: SuggestionRule[] = [
  { pattern: /mercadona|lidl|aldi|carrefour|el\s?corte|supermercado|hipercor|dia\b/i, categoryName: 'Alimentación' },
  { pattern: /caf[eé]|bar\b|restaurante|pizza|sushi|mcdonalds|burgerking|kfc|tapas|hamburgues/i, categoryName: 'Restaurantes' },
  { pattern: /repsol|bp\b|shell|gasolina|gasolinera|gasoil|combustible/i, categoryName: 'Transporte' },
  { pattern: /renfe|cercanias|metro|bus\b|taxi|uber|cabify|vuelo|tren\b|avion/i, categoryName: 'Transporte' },
  { pattern: /amazon|ebay|zara|h&m|mango|pull&bear|shein|aliexpress/i, categoryName: 'Ropa' },
  { pattern: /netflix|spotify|hbo|disney\+|apple\s?tv|prime\s?video|twitch/i, categoryName: 'Entretenimiento' },
  { pattern: /luz\b|agua\b|gas\b|internet|telef[oó]nica|movistar|vodafone|orange\b/i, categoryName: 'Utilidades' },
  { pattern: /farmacia|médico|medico|doctor|hospital|clínica|clinica|salud/i, categoryName: 'Salud' },
  { pattern: /gimnasio|gym\b|pilates|yoga|deporte/i, categoryName: 'Salud' },
  { pattern: /alquiler|hipoteca|comunidad|ibi\b/i, categoryName: 'Hogar' },
  { pattern: /seguro|axa|mapfre|mutua|allianz/i, categoryName: 'Seguros' },
  { pattern: /sueldo|salario|nomina|nómina|paga\b/i, categoryName: 'Salario' },
  { pattern: /dividendo|intereses|rentabilidad|broker|degiro|etoro/i, categoryName: 'Inversiones' },
  { pattern: /freelance|factura|honorarios|cliente\b/i, categoryName: 'Freelance' },
  { pattern: /libro|curso|academia|formaci[oó]n|udemy|coursera/i, categoryName: 'Educación' },
];

// ─── Suggester ────────────────────────────────────────────────────────────────

/**
 * Suggest a category name based on the note text.
 *
 * @param note - The user-typed note string.
 * @returns The suggested category name, or null if nothing matches.
 */
export function suggestCategoryFromNote(note: string): string | null {
  if (!note || note.trim().length < 2) return null;

  for (const rule of RULES) {
    if (rule.pattern.test(note)) {
      return rule.categoryName;
    }
  }

  return null;
}
