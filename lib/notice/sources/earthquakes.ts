import { type NoticeCard, type NoticeSource } from "@/lib/notice/card";
import { type GeoLocation } from "@/lib/config";

// Only quakes someone would actually feel at home: big, and close to a family place.
const MIN_MAG = 4.5;
const RADIUS_KM = 50;

export function buildQuakeUrl(loc: GeoLocation, now: Date): string {
  const start = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    format: "geojson",
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    maxradiuskm: String(RADIUS_KM),
    minmagnitude: String(MIN_MAG),
    starttime: start,
    orderby: "magnitude",
  });
  return `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`;
}

interface QuakeFeature {
  properties?: { mag?: number; place?: string; time?: number; url?: string };
}

export function parseQuakes(json: unknown, loc: GeoLocation): NoticeCard[] {
  const features = (json as { features?: QuakeFeature[] })?.features;
  if (!Array.isArray(features)) return [];
  return features
    .filter((f): f is Required<QuakeFeature> => typeof f?.properties?.mag === "number")
    .slice(0, 1) // strongest (query is ordered by magnitude)
    .map((f) => {
      const mag = f.properties.mag!;
      const place = f.properties.place ?? `near ${loc.label}`;
      return {
        id: `quake-${loc.key}-${f.properties.time}`,
        kind: "quake" as const,
        label: `near ${loc.label.toLowerCase()}`,
        title: `magnitude ${mag.toFixed(1)} earthquake — ${place}.`,
        priority: 80 + mag,
        href: f.properties.url,
      };
    });
}

export const earthquakesSource: NoticeSource = async (ctx, fetchImpl = fetch) => {
  const results = await Promise.all(
    ctx.locations.map(async (loc) => {
      try {
        const res = await fetchImpl(buildQuakeUrl(loc, ctx.now));
        if (!res.ok) return [];
        return parseQuakes(await res.json(), loc);
      } catch {
        return [];
      }
    }),
  );
  return results.flat();
};
