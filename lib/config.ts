export type LocationKey = "ludlow" | "edinburgh" | "santaCruz" | "queenstown" | "whistler";

export interface GeoLocation {
  key: LocationKey;
  slug: string;
  label: string;
  sublabel: string;
  latitude: number;
  longitude: number;
  timezone: string;
  watercolor: string; // filename stem in /public/watercolor
}

export const HOME: GeoLocation = {
  key: "ludlow",
  slug: "ludlow",
  label: "Ludlow",
  sublabel: "Anne & Peter",
  latitude: 52.3675,
  longitude: -2.7181,
  timezone: "Europe/London",
  watercolor: "place-ludlow",
};

export const FAMILY_LOCATIONS: GeoLocation[] = [
  HOME,
  {
    key: "edinburgh", slug: "edinburgh", label: "Edinburgh", sublabel: "Kate",
    latitude: 55.9533, longitude: -3.1883, timezone: "Europe/London",
    watercolor: "place-edinburgh",
  },
  {
    key: "santaCruz", slug: "santa-cruz", label: "Santa Cruz", sublabel: "Sam",
    latitude: 36.9741, longitude: -122.0308, timezone: "America/Los_Angeles",
    watercolor: "place-santacruz",
  },
  {
    key: "queenstown", slug: "queenstown", label: "Queenstown", sublabel: "Tom",
    latitude: -45.0312, longitude: 168.6626, timezone: "Pacific/Auckland",
    watercolor: "place-queenstown",
  },
];

export const REFRESH = { dataMs: 600_000 } as const;

export const WHISTLER: GeoLocation = {
  key: "whistler",
  slug: "whistler",
  label: "Whistler",
  sublabel: "the cabin",
  latitude: 50.1163,
  longitude: -122.9574,
  timezone: "America/Vancouver",
  watercolor: "place-whistler",
};

export const SKI_LOCATIONS: GeoLocation[] = [
  FAMILY_LOCATIONS.find((l) => l.key === "queenstown")!,
  WHISTLER,
];

export const ALL_LOCATIONS: GeoLocation[] = [
  ...FAMILY_LOCATIONS,
  WHISTLER,
];

export function locationBySlug(slug: string): GeoLocation | undefined {
  return ALL_LOCATIONS.find((l) => l.slug === slug);
}

// Kitchen display schedule, in Ludlow wall-clock hours. Night mode dims the
// screen to a quiet clock; the daily reload (inside the night) picks up anything
// the live data polling can't, like a stuck browser tab. Tap-to-open panels
// close themselves after panelIdleMs without a touch, so the wall screen always
// drifts back to the dashboard.
export const KITCHEN = {
  nightStartHour: 0, // midnight–6am, Ludlow time; wakes by itself at 6 (a tap wakes it for 5 min)
  nightEndHour: 6,
  dailyReloadHour: 4,
  panelIdleMs: 45_000,
  // How the frame app fills its photo panel: "smart" crops landscape photos to fill
  // but keeps portrait ones whole (over a blur); "whole" never crops; "fill" always does.
  photoFit: "smart" as "smart" | "whole" | "fill",
} as const;
