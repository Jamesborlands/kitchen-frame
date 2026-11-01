export interface FloodWarning {
  severity: string;
  severityLevel: number;
  description: string;
  message: string;
  area: string;
}

export interface RiverLevel {
  station: string;
  river: string;
  level: number | null;
  unit: string;
  history: number[];
}

export interface RiverStation {
  station: string;
  river: string;
  measuresUrl: string;
}

export function buildFloodWarningsUrl(lat: number, long: number, distKm: number): string {
  const params = new URLSearchParams({
    lat: String(lat),
    long: String(long),
    dist: String(distKm),
  });
  return `https://environment.data.gov.uk/flood-monitoring/id/floods?${params.toString()}`;
}

export function buildRiverStationsUrl(lat: number, long: number, distKm: number): string {
  const params = new URLSearchParams({
    parameter: "level",
    lat: String(lat),
    long: String(long),
    dist: String(distKm),
  });
  return `https://environment.data.gov.uk/flood-monitoring/id/stations?${params.toString()}`;
}

interface RawFloodArea {
  riverOrSea?: string;
  eaAreaName?: string;
}

interface RawFloodWarning {
  severity: string;
  severityLevel: number | string;
  description: string;
  message: string;
  floodArea?: RawFloodArea;
  eaAreaName?: string;
}

interface RawFloodWarningsResponse {
  items?: RawFloodWarning[];
}

export function parseFloodWarnings(json: unknown): FloodWarning[] {
  const raw = json as RawFloodWarningsResponse;
  if (!raw.items || raw.items.length === 0) return [];
  return raw.items.map((item) => ({
    severity: item.severity,
    severityLevel: Number(item.severityLevel),
    description: item.description,
    message: item.message,
    area: item.floodArea?.eaAreaName ?? item.eaAreaName ?? "",
  }));
}

interface RawStationItem {
  "@id"?: unknown;
  label?: unknown;
  riverName?: unknown;
}

interface RawStationsResponse {
  items?: RawStationItem[];
}

export function parseRiverStations(json: unknown): RiverStation[] {
  const raw = json as RawStationsResponse;
  if (!raw.items || raw.items.length === 0) return [];

  const seen = new Set<string>();
  const results: RiverStation[] = [];

  for (const item of raw.items) {
    if (!item.riverName) continue;
    const river = String(item.riverName);
    if (seen.has(river)) continue;
    seen.add(river);

    const labelRaw = item.label;
    const station = Array.isArray(labelRaw) ? String(labelRaw[0]) : String(labelRaw ?? "");
    const measuresUrl =
      String(item["@id"]).replace(/^http:/, "https:") + "/measures";

    results.push({ station, river, measuresUrl });
    if (results.length >= 5) break;
  }

  return results;
}

interface RawMeasureItem {
  "@id"?: string;
  parameter?: string;
  latestReading?: { value?: number };
  unitName?: string;
}

interface RawMeasuresResponse {
  items?: RawMeasureItem[];
}

export function levelMeasureId(json: unknown): string | null {
  const raw = json as RawMeasuresResponse;
  if (!raw.items || raw.items.length === 0) return null;
  const levelItem = raw.items.find((i) => i.parameter === "level") ?? raw.items[0];
  if (!levelItem) return null;
  const id = levelItem["@id"];
  if (typeof id !== "string") return null;
  return id.replace(/^http:/, "https:");
}

export function buildReadingsUrl(measureId: string, sinceISO: string): string {
  return `${measureId}/readings?since=${encodeURIComponent(sinceISO)}&_sorted&_limit=96`;
}

interface RawReadingsItem {
  value?: unknown;
}

interface RawReadingsResponse {
  items?: RawReadingsItem[];
}

export function parseReadings(json: unknown): number[] {
  if (json === null || json === undefined) return [];
  const raw = json as RawReadingsResponse;
  if (!raw.items || !Array.isArray(raw.items)) return [];
  const results: number[] = [];
  for (const item of raw.items) {
    const v = item.value;
    if (typeof v === "number" && !Number.isNaN(v)) {
      results.push(v);
    }
  }
  return results;
}

export function parseStationLevel(json: unknown): { level: number | null; unit: string } {
  const raw = json as RawMeasuresResponse;
  if (!raw.items || raw.items.length === 0) return { level: null, unit: "m" };

  const levelItem = raw.items.find((i) => i.parameter === "level") ?? raw.items[0];
  if (!levelItem) return { level: null, unit: "m" };

  return {
    level: levelItem.latestReading?.value ?? null,
    unit: levelItem.unitName ?? "m",
  };
}

async function fetchJsonWithTimeout(url: string, ms = 6000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchFloodWarnings(lat: number, long: number, distKm: number): Promise<FloodWarning[]> {
  const json = await fetchJsonWithTimeout(buildFloodWarningsUrl(lat, long, distKm));
  return parseFloodWarnings(json);
}

export async function fetchRiverLevels(lat: number, long: number, distKm: number): Promise<RiverLevel[]> {
  const json = await fetchJsonWithTimeout(buildRiverStationsUrl(lat, long, distKm));
  const stations = parseRiverStations(json);

  if (stations.length === 0) return [];

  const levels = await Promise.all(
    stations.map(async ({ station, river, measuresUrl }) => {
      try {
        const measuresJson = await fetchJsonWithTimeout(measuresUrl);
        const { level, unit } = parseStationLevel(measuresJson);
        const measureId = levelMeasureId(measuresJson);
        let history: number[] = [];
        if (measureId) {
          try {
            const sinceISO = new Date(Date.now() - 86_400_000).toISOString();
            history = parseReadings(
              await fetchJsonWithTimeout(buildReadingsUrl(measureId, sinceISO))
            );
          } catch {
            history = [];
          }
        }
        return { station, river, level, unit, history };
      } catch {
        return { station, river, level: null, unit: "m", history: [] };
      }
    })
  );

  return levels;
}
