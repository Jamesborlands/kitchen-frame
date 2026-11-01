// Finding a place by name for the family page (Open-Meteo's free geocoder, no key).
import type { Place } from "@/lib/family/settings";
import { paintingFor } from "@/lib/geo/paintings";

export interface PlaceResult { name: string; where: string; latitude: number; longitude: number; timezone: string }

const round = (n: number) => Math.round(n * 10_000) / 10_000;

export async function searchPlaces(q: string, fetchImpl: typeof fetch = fetch): Promise<PlaceResult[]> {
  const name = q.trim().slice(0, 80);
  if (!name) return [];
  try {
    const res = await fetchImpl(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=en&format=json`);
    if (!res.ok) return [];
    const body = (await res.json()) as { results?: { name?: string; latitude?: number; longitude?: number; timezone?: string; country?: string; admin1?: string }[] };
    return (body.results ?? [])
      .filter((r) => r.name && typeof r.latitude === "number" && typeof r.longitude === "number" && r.timezone)
      .map((r) => ({
        name: r.name!,
        where: [r.admin1, r.country].filter(Boolean).join(", "),
        latitude: round(r.latitude!),
        longitude: round(r.longitude!),
        timezone: r.timezone!,
      }));
  } catch {
    return [];
  }
}

/** A family clock for a found place: its painting if we have one, else its weather's sky. */
export function placeFromResult(r: PlaceResult, sublabel: string): Place {
  const slug = r.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "place";
  return {
    key: `${slug}-${Math.random().toString(36).slice(2, 7)}`,
    label: r.name.slice(0, 40),
    sublabel: sublabel.trim().slice(0, 40),
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
    watercolor: paintingFor(r.name),
    extra: null,
  };
}

/** Someone moved: the same person and clock, at the new town (its sea/snow panel goes with the old place). */
export function movePlace(p: Place, r: PlaceResult): Place {
  return {
    key: p.key,
    label: r.name.slice(0, 40),
    sublabel: p.sublabel,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
    watercolor: paintingFor(r.name),
    extra: null,
  };
}
