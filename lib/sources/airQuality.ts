export interface AirReading {
  europeanAqi: number | null;
  grassPollen: number | null;
  birchPollen: number | null;
}

const HOURLY_FIELDS = ["european_aqi", "grass_pollen", "birch_pollen"].join(",");

export function buildAirQualityUrl(lat: number, lon: number, timezone: string): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: HOURLY_FIELDS,
    timezone,
  });
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`;
}

interface RawAir {
  hourly: Record<string, (number | null)[]>;
}

function latest(series: (number | null)[] | undefined): number | null {
  if (!series) return null;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] !== null && series[i] !== undefined) return series[i] as number;
  }
  return null;
}

export function parseAirQuality(json: unknown): AirReading {
  const raw = json as RawAir;
  const h = raw.hourly ?? {};
  return {
    europeanAqi: latest(h.european_aqi),
    grassPollen: latest(h.grass_pollen),
    birchPollen: latest(h.birch_pollen),
  };
}

// The worst hour of one local day ("2026-06-23"); the kitchen cares whether today
// is a bad pollen day, not what the last sample in the forecast happens to be.
export function peakForDay(json: unknown, day: string): AirReading {
  const h = (json as RawAir).hourly ?? {};
  const times = (h.time ?? []) as unknown as string[];
  const peak = (series: (number | null)[] | undefined): number | null => {
    let best: number | null = null;
    times.forEach((t, i) => {
      const v = series?.[i];
      if (t.startsWith(day) && typeof v === "number" && (best === null || v > best)) best = v;
    });
    return best;
  };
  return {
    europeanAqi: peak(h.european_aqi),
    grassPollen: peak(h.grass_pollen),
    birchPollen: peak(h.birch_pollen),
  };
}

export async function fetchAirQuality(
  lat: number, lon: number, timezone: string, fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const res = await fetchImpl(buildAirQualityUrl(lat, lon, timezone));
  if (!res.ok) throw new Error(`air ${res.status}`);
  return res.json();
}
