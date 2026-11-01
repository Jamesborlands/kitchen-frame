// The family places we have watercolour paintings of, found by the town's name, so
// a clock added or moved on the family page gets its painting (others show their
// weather's sky). Paint a new one with scripts/generate-watercolors.mjs.
const PAINTINGS: [RegExp, string][] = [
  [/^north berwick\b/i, "place-northberwick"],
  [/^ludlow\b/i, "place-ludlow"],
  [/^santa cruz\b/i, "place-santacruz"],
  [/^queenstown\b/i, "place-queenstown"],
  [/^edinburgh$/i, "place-edinburgh"],
  [/^whistler\b/i, "place-whistler"],
];

export function paintingFor(name: string): string {
  const n = name.trim();
  return PAINTINGS.find(([re]) => re.test(n))?.[1] ?? "";
}
