import type { Place } from "./types";
import { WALKS } from "./walks";
import { CYCLING } from "./cycling";
import { DAYS_OUT } from "./daysOut";

export type { Place } from "./types";
export { WALKS } from "./walks";
export { CYCLING } from "./cycling";
export { DAYS_OUT } from "./daysOut";

export const ALL_PLACES: Place[] = [...WALKS, ...CYCLING, ...DAYS_OUT];

export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86_400_000);
}

export function suggestionForDate(date: Date, places: Place[] = ALL_PLACES): Place {
  const index = dayOfYear(date) % places.length;
  return places[index];
}
