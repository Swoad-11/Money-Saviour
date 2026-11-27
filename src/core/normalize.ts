/**
 * Turn a typed item name into its lookup key.
 * "Gas-Bill " → "gas bill", "shutki-" → "shutki", "Ice_Cream" → "ice cream".
 * "+" and "," inside a name are kept so combined items stay recognisable.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s*([+,])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .trim();
}

/** Parts of a combined name: "soap+eggs" → ["soap", "eggs"]; "alu,peyaj" → ["alu", "peyaj"]. */
export function nameParts(key: string): string[] {
  return key
    .split(/[+,]/)
    .map((p) => p.trim())
    .filter(Boolean);
}
