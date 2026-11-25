const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bavda\.?\b/g, 'avenida'],
  [/\bav\.?\b/g, 'avenida'],
  [/\bpje\.?\b/g, 'pasaje'],
  [/\bsta\.?\b/g, 'santa'],
  [/\bsto\.?\b/g, 'santo'],
  [/\bgral\.?\b/g, 'general'],
  [/\bpdte\.?\b/g, 'presidente'],
];

/**
 * Quita tildes, pasa a minúsculas y colapsa espacios repetidos.
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza direcciones chilenas expandiendo abreviaturas comunes
 * y removiendo puntuación innecesaria para comparaciones fiables.
 */
export function normalizeAddress(input: string): string {
  let result = normalizeText(input);

  for (const [pattern, replacement] of ABBREVIATIONS) {
    result = result.replace(pattern, replacement);
  }

  return result
    .replace(/[.,;:#'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
