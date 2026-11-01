import { XMLParser } from "fast-xml-parser";

export interface NewsItem {
  title: string;
  link: string;
  published: string;
  image?: string;
  description?: string;
}

export const LUDLOW_ADVERTISER_RSS = "https://www.ludlowadvertiser.co.uk/news/rss/";
export const BBC_SHROPSHIRE_RSS = "https://feeds.bbci.co.uk/news/england/shropshire/rss.xml";

// Both feeds, merged by fetchAllNews. The Advertiser is a general feed (needs the
// local-area filter); BBC Shropshire is already regional but its terse titles
// mean we match on title + description.
export const NEWS_FEEDS = [LUDLOW_ADVERTISER_RSS, BBC_SHROPSHIRE_RSS];

export const NEWS_EXCLUDE = [
  "for sale",
  "guide price",
  "bedroom",
  "property of the week",
  "sponsored",
  "advertorial",
  "horoscope",
  "your stars",
  "competition",
  "win a",
  "win £",
  "things to do",
  "best places",
  "in pictures",
  "watch:",
  "recap:",
  "live:",
  "wordle",
  "quiz",
  "puzzle",
  "money off",
  "deal",
  "discount code",
];

export const NEWS_INCLUDE = [
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
  "onibury",
  "mortimer forest",
  "river teme",
  "river corve",
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

interface RawRssChannel {
  item?: RawRssItem | RawRssItem[];
}

interface RawRss {
  rss?: {
    channel?: RawRssChannel;
  };
}

export function isRelevantNews(item: NewsItem): boolean {
  const lower = item.title.toLowerCase();
  if (NEWS_EXCLUDE.some((phrase) => lower.includes(phrase))) return false;
  return NEWS_INCLUDE.some((term) => lower.includes(term));
}

export function dedupeByTitle(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseRss(xml: string, limit?: number): NewsItem[] {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const result = parser.parse(xml) as RawRss;
    const rawItems = result.rss?.channel?.item;
    if (!rawItems) return [];
    const items: RawRssItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];
    const mapped = items.map((item) => ({
      title: item.title,
      link: item.link,
      published: item.pubDate,
      image: item["media:thumbnail"]?.["@_url"] ?? item["media:content"]?.["@_url"],
      description: typeof item.description === "string" ? item.description.trim() : undefined,
    }));
    return limit !== undefined ? mapped.slice(0, limit) : mapped;
  } catch {
    return [];
  }
}

export async function fetchNews(url = LUDLOW_ADVERTISER_RSS, limit = 8): Promise<NewsItem[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`news ${res.status}`);
  const all = parseRss(await res.text());
  return dedupeByTitle(all).filter(isRelevantNews).slice(0, limit);
}

/** Local relevance over title + description — used when merging feeds whose
 *  titles are terse (e.g. BBC Shropshire). Excludes clutter, requires a local term. */
export function isLocalNews(item: NewsItem): boolean {
  const hay = `${item.title} ${item.description ?? ""}`.toLowerCase();
  if (NEWS_EXCLUDE.some((phrase) => hay.includes(phrase))) return false;
  return NEWS_INCLUDE.some((term) => hay.includes(term));
}

function publishedTime(item: NewsItem): number {
  const t = new Date(item.published).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Merge several local feeds (Ludlow Advertiser + BBC Shropshire) into one
 * newest-first list. Each feed is fetched fail-soft — a down feed just
 * contributes nothing. Items are deduped by title, filtered to genuinely
 * local stories, and sorted by publish date.
 */
export async function fetchAllNews(
  urls: string[] = NEWS_FEEDS,
  limit = 8,
  fetchImpl: typeof fetch = fetch,
): Promise<NewsItem[]> {
  const perFeed = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetchImpl(url);
        if (!res.ok) return [];
        return parseRss(await res.text());
      } catch {
        return [];
      }
    }),
  );
  return dedupeByTitle(perFeed.flat())
    .filter(isLocalNews)
    .sort((a, b) => publishedTime(b) - publishedTime(a))
    .slice(0, limit);
}
