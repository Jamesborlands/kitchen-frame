export interface SnowConditions {
  snowDepthCm: number | null;
  recentSnowfallCm: number | null;
}

export function buildSnowUrl(lat: number, lon: number, timezone: string): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: "snow_depth",
    daily: "snowfall_sum",
    past_days: "3",
    forecast_days: "1",
    timezone,
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

interface RawSnow {
  hourly?: {
    time?: string[];
    snow_depth?: (number | null)[];
  };
  daily?: {
    time?: string[];
    snowfall_sum?: (number | null)[];
  };
}

export function parseSnow(json: unknown): SnowConditions {
  const raw = json as RawSnow;

  // Latest non-null hourly snow_depth (metres → cm × 100)
  let snowDepthCm: number | null = null;
  const depths = raw.hourly?.snow_depth ?? [];
  for (let i = depths.length - 1; i >= 0; i--) {
    if (depths[i] != null) {
      snowDepthCm = Math.round((depths[i] as number) * 100);
      break;
    }
  }

  // Sum of non-null daily snowfall_sum (already cm)
  let recentSnowfallCm: number | null = null;
  const sums = raw.daily?.snowfall_sum ?? [];
  if (sums.length > 0) {
    const total = sums
      .filter((v): v is number => v != null)
      .reduce((acc, v) => acc + v, 0);
    recentSnowfallCm = Math.round(total * 10) / 10;
  }

  return { snowDepthCm, recentSnowfallCm };
}

// Ski towns sit well below their ski fields, so the town's own grid cell rarely
// holds snow. A place within ~15km of one of these reads the snow up on the hill.
const SKI_FIELDS: { near: [number, number]; field: [number, number] }[] = [
  { near: [-45.0312, 168.6626], field: [-45.0569, 168.8167] }, // Queenstown → the Remarkables
  { near: [50.1163, -122.9574], field: [50.0592, -122.9486] }, // Whistler village → Whistler Mountain
];

export function snowPoint(lat: number, lon: number): [number, number] {
  const hit = SKI_FIELDS.find(({ near: [a, b] }) => Math.abs(a - lat) < 0.14 && Math.abs(b - lon) < 0.2);
  return hit ? hit.field : [lat, lon];
}

export async function fetchSnow(lat: number, lon: number, timezone: string): Promise<SnowConditions> {
  const [la, lo] = snowPoint(lat, lon);
  const res = await fetch(buildSnowUrl(la, lo, timezone));
  if (!res.ok) throw new Error(`snow ${res.status}`);
  return parseSnow(await res.json());
}
