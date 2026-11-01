export interface TideEvent {
  time: string;
  heightFt: number;
  type: "high" | "low";
}

export function buildTidesUrl(
  station: string,
  beginYYYYMMDD: string,
  endYYYYMMDD: string
): string {
  const params = new URLSearchParams({
    product: "predictions",
    application: "cottage-view",
    begin_date: beginYYYYMMDD,
    end_date: endYYYYMMDD,
    datum: "MLLW",
    station,
    time_zone: "lst_ldt",
    units: "english",
    interval: "hilo",
    format: "json",
  });
  return `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params.toString()}`;
}

interface RawPrediction {
  t: string;
  v: string;
  type: string;
}

interface RawTidesResponse {
  predictions?: RawPrediction[];
}

export function parseTides(json: unknown): TideEvent[] {
  const raw = json as RawTidesResponse;
  if (!raw.predictions || raw.predictions.length === 0) return [];
  return raw.predictions.map((p) => ({
    time: p.t,
    heightFt: Number(p.v),
    type: p.type === "H" ? "high" : "low",
  }));
}

export async function fetchTides(
  station: string,
  beginYYYYMMDD: string,
  endYYYYMMDD: string
): Promise<TideEvent[]> {
  const res = await fetch(buildTidesUrl(station, beginYYYYMMDD, endYYYYMMDD));
  if (!res.ok) throw new Error(`tides ${res.status}`);
  return parseTides(await res.json());
}
