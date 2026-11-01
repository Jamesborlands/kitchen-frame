export interface TrainService {
  std: string;
  etd: string;
  platform: string;
  operator: string;
}

export interface TrainBoard {
  services: TrainService[];
  messages: string[];
}

export function buildTrainsUrl(fromCrs: string, toCrs: string, count: number): string {
  return `https://huxley2.azurewebsites.net/departures/${fromCrs}/to/${toCrs}/${count}`;
}

export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface RawService {
  std?: unknown;
  etd?: unknown;
  platform?: unknown;
  operator?: unknown;
}

interface RawMessage {
  value?: unknown;
}

interface RawTrainBoard {
  trainServices?: RawService[] | null;
  nrccMessages?: RawMessage[] | null;
}

export function parseTrains(json: unknown): TrainBoard {
  const raw = json as RawTrainBoard;

  const services: TrainService[] = (raw.trainServices ?? []).map((s) => ({
    std: typeof s.std === "string" ? s.std : "",
    etd: typeof s.etd === "string" ? s.etd : "",
    platform: typeof s.platform === "string" ? s.platform : "—",
    operator: typeof s.operator === "string" ? s.operator : "",
  }));

  const messages: string[] = (raw.nrccMessages ?? [])
    .map((m) => (typeof m.value === "string" ? stripHtml(m.value) : ""))
    .filter((m) => m.length > 0);

  return { services, messages };
}

export async function fetchTrains(
  fromCrs = "LUD",
  toCrs = "SHR",
  count = 6,
): Promise<TrainBoard> {
  const url = buildTrainsUrl(fromCrs, toCrs, count);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`trains ${res.status}`);
    return parseTrains(await res.json());
  } finally {
    clearTimeout(timer);
  }
}
