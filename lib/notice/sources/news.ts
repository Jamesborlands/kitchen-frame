import { type NoticeCard, type NoticeSource } from "@/lib/notice/card";
import { NEWS_EXCLUDE, fetchAllNews, parseRss } from "@/lib/sources/news";

// Headlines for the kitchen's "worth noticing" card: the top national BBC story,
// and the top Ludlow-area story (Ludlow Advertiser + BBC Shropshire, already
// filtered to local by fetchAllNews).

export const BBC_TOP_RSS = "https://feeds.bbci.co.uk/news/rss.xml";

export const bbcTopSource: NoticeSource = async (_ctx, fetchImpl = fetch) => {
  try {
    const res = await fetchImpl(BBC_TOP_RSS);
    if (!res.ok) return [];
    const top = parseRss(await res.text()).find((i) => {
      const t = i.title?.toLowerCase() ?? "";
      return t && !NEWS_EXCLUDE.some((phrase) => t.includes(phrase));
    });
    return top ? [card("bbc", "bbc news", top.title, top.link, 30)] : [];
  } catch {
    return [];
  }
};

export const localNewsSource: NoticeSource = async (_ctx, fetchImpl = fetch) => {
  const [top] = await fetchAllNews(undefined, 1, fetchImpl);
  return top ? [card("local", "ludlow news", top.title, top.link, 35)] : [];
};

function card(id: string, label: string, title: string, href: string, priority: number): NoticeCard {
  return { id: `news-${id}-${title.slice(0, 24)}`, kind: "news", label, title, href, priority };
}
