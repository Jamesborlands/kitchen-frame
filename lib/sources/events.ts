import { XMLParser } from "fast-xml-parser";

export interface EventItem {
  title: string;
  link: string;
  published: string;
  description?: string;
  image?: string;
}

// The Ludlow Advertiser's "leisure" feed is the live what's-on source — same
// publisher and structure as the news feed, but a mix of genuine local events
// and national clutter (soaps, supermarket promos), so it needs filtering.
export const LUDLOW_LEISURE_RSS = "https://www.ludlowadvertiser.co.uk/leisure/rss/";

// National filler that has nothing to do with local goings-on.
export const EVENTS_EXCLUDE = [
  "emmerdale",
  "coronation street",
  "corrie",
  "eastenders",
  "soap opera",
  "tv schedule",
  "schedule change",
  "schedule shakeup",
  "schedule shake-up",
  "morrisons",
  "sainsbury",
  "tesco",
  "asda",
  "aldi",
  "lidl",
  "co-op",
  "fast food chain",
  "horoscope",
  "your stars",
  "wordle",
  "quiz",
  "puzzle",
];

// At least one of these must appear (in the title or description) for an item
// to count as a local event — place names plus the main Ludlow venues.
export const EVENTS_INCLUDE = [
  "ludlow",
  "shropshire",
  "craven arms",
  "church stretton",
  "clee hill",
  "cleobury",
  "tenbury",
  "bishop's castle",
  "bromfield",
  "ludford",
  "assembly rooms",
  "st laurence",
  "castle",
  "food festival",
];

interface RawMediaThumbnail {
  "@_url"?: string;
}

interface RawRssItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  "media:thumbnail"?: RawMediaThumbnail;
  "media:content"?: RawMediaThumbnail;
}

interface RawRss {
  rss?: { channel?: { item?: RawRssItem | RawRssItem[] } };
}

export function isRelevantEvent(item: EventItem): boolean {
  const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
  if (EVENTS_EXCLUDE.some((phrase) => haystack.includes(phrase))) return false;
  return EVENTS_INCLUDE.some((term) => haystack.includes(term));
}

export function dedupeByTitle(items: EventItem[]): EventItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseEventsRss(xml: string, limit?: number): EventItem[] {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const result = parser.parse(xml) as RawRss;
    const rawItems = result.rss?.channel?.item;
    if (!rawItems) return [];
    const items: RawRssItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];
    const mapped: EventItem[] = items.map((item) => ({
      title: item.title,
      link: item.link,
      published: item.pubDate,
      description: typeof item.description === "string" ? item.description.trim() : undefined,
      image: item["media:thumbnail"]?.["@_url"] ?? item["media:content"]?.["@_url"],
    }));
    return limit !== undefined ? mapped.slice(0, limit) : mapped;
  } catch {
    return [];
  }
}

export async function fetchEvents(url = LUDLOW_LEISURE_RSS, limit = 6): Promise<EventItem[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`events ${res.status}`);
  const all = parseEventsRss(await res.text());
  return dedupeByTitle(all).filter(isRelevantEvent).slice(0, limit);
}
