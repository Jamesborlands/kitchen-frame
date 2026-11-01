export type Hemisphere = "north" | "south";

export function hemisphereOf(latitude: number): Hemisphere {
  return latitude >= 0 ? "north" : "south";
}

export type WatercolorSeason = "summer" | "winter";

/**
 * Two-season split for the location watercolours: the cold/bare/snowy half of
 * the year vs the warm/green half, flipped for the southern hemisphere. Up
 * north the cold half is Nov–Apr; down south it's May–Oct. This keeps a snowy
 * Queenstown in the New Zealand winter but green in its summer.
 */
export function watercolorSeason(date: Date, latitude: number): WatercolorSeason {
  const month = date.getUTCMonth() + 1; // 1–12
  const northColdHalf = month >= 11 || month <= 4;
  const cold = hemisphereOf(latitude) === "north" ? northColdHalf : !northColdHalf;
  return cold ? "winter" : "summer";
}

/** The place paintings in /public/watercolor (add a name here when a new one is painted). */
export const PLACE_SCENES = new Set([
  "place-ludlow-spring", "place-ludlow-summer", "place-ludlow-autumn", "place-ludlow-winter",
  "place-edinburgh-spring", "place-edinburgh-summer", "place-edinburgh-autumn", "place-edinburgh-winter",
  "place-northberwick-spring", "place-northberwick-summer", "place-northberwick-autumn", "place-northberwick-winter",
  "place-santacruz-spring", "place-santacruz-summer", "place-santacruz-autumn", "place-santacruz-winter",
  "place-queenstown-spring", "place-queenstown-summer", "place-queenstown-autumn", "place-queenstown-winter",
  "place-whistler-spring", "place-whistler-summer", "place-whistler-autumn", "place-whistler-winter",
]);

/** The four seasons where the place is (southern ones flipped): Mar–May is spring up north. */
export function placeSeason(date: Date, latitude: number): "spring" | "summer" | "autumn" | "winter" {
  const month = date.getUTCMonth() + 1;
  const north = month >= 3 && month <= 5 ? "spring" : month >= 6 && month <= 8 ? "summer" : month >= 9 && month <= 11 ? "autumn" : "winter";
  if (hemisphereOf(latitude) === "north") return north;
  return ({ spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" } as const)[north];
}

/**
 * A place's painting for the date: its own season of four when that's painted
 * ("place-queenstown" in October → "place-queenstown-spring"), else the
 * summer/winter pair every place has.
 */
export function placeScene(stem: string, date: Date, latitude: number): string {
  const four = `${stem}-${placeSeason(date, latitude)}`;
  return PLACE_SCENES.has(four) ? four : `${stem}-${watercolorSeason(date, latitude)}`;
}

/** Seasonal watercolour filename stem, e.g. "place-queenstown" → "place-queenstown-spring". */
export const seasonalScene = placeScene;

export function isSkiSeason(date: Date, latitude: number): boolean {
  const hemisphere = hemisphereOf(latitude);
  const month = date.getUTCMonth() + 1; // 1–12

  if (hemisphere === "north") {
    // Northern ski season: Dec (12), Jan (1), Feb (2), Mar (3), Apr (4)
    return month === 12 || (month >= 1 && month <= 4);
  } else {
    // Southern ski season: Jun (6), Jul (7), Aug (8), Sep (9), Oct (10)
    return month >= 6 && month <= 10;
  }
}
