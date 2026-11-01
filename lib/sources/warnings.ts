import { XMLParser } from "fast-xml-parser";

// Met Office severe-weather warnings for the West Midlands region (covers
// Ludlow / Shropshire). Free, keyless RSS.

export type WarningLevel = "yellow" | "amber" | "red";

export interface Warning {
  level: WarningLevel;
  type: string; // "extreme heat", "thunderstorm", …
  period: string; // "from 0800 Wed 24 Jun to 2259 Thu 25 Jun"
  link: string;
}

export const MET_OFFICE_WM_WARNINGS =
  "https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/WM";

const SEVERITY: Record<WarningLevel, number> = { red: 3, amber: 2, yellow: 1 };

interface RawItem {
  title?: string;
  description?: string;
  link?: string;
}
interface RawRss {
  rss?: { channel?: { item?: RawItem | RawItem[] } };
}

function levelFrom(title: string): WarningLevel | null {
  const m = title.match(/\b(red|amber|yellow)\b/i);
  return m ? (m[1].toLowerCase() as WarningLevel) : null;
}

function typeFrom(title: string): string {
  const m = title.match(/warning of (.+?) affecting/i);
  return m ? m[1].trim() : "severe weather";
}

function periodFrom(description: string): string {
  const m = description.match(/valid (from .+?)\s*$/i);
  return m ? m[1].trim() : "";
}

/**
 * Parse the Met Office regional RSS into warnings that affect `area`
 * (default Shropshire). Deduped by level+type (the feed repeats the same
 * warning per sub-area) and sorted most-severe first.
 */
export function parseWarnings(xml: string, area = "Shropshire"): Warning[] {
  try {
    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(xml) as RawRss;
    const raw = result.rss?.channel?.item;
    if (!raw) return [];
    const items = Array.isArray(raw) ? raw : [raw];
    const out: Warning[] = [];
    const seen = new Set<string>();
    for (const it of items) {
      const title = typeof it.title === "string" ? it.title : "";
      const description = typeof it.description === "string" ? it.description : "";
      if (!description.toLowerCase().includes(area.toLowerCase())) continue;
      const level = levelFrom(title);
      if (!level) continue;
      const type = typeFrom(title);
      const key = `${level}-${type.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ level, type, period: periodFrom(description), link: typeof it.link === "string" ? it.link : "" });
    }
    return out.sort((a, b) => SEVERITY[b.level] - SEVERITY[a.level]);
  } catch {
    return [];
  }
}

/** Pull a friendly end-of-validity out of a period string, e.g.
 *  "from 0800 Wed 24 Jun to 2259 Thu 25 Jun" → "Thu 25 Jun". */
export function warningEndDay(period: string): string {
  const m = period.match(/to \d{3,4} (\w{3} \d{1,2} \w{3})/);
  return m ? m[1] : "";
}

export async function fetchWarnings(
  url = MET_OFFICE_WM_WARNINGS,
  area = "Shropshire",
  fetchImpl: typeof fetch = fetch,
): Promise<Warning[]> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`warnings ${res.status}`);
  return parseWarnings(await res.text(), area);
}
