import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseRss, isRelevantNews, dedupeByTitle, fetchNews, fetchAllNews, isLocalNews, NewsItem } from "@/lib/sources/news";
import { readFileSync } from "fs";
import { join } from "path";

const fixture = readFileSync(join(__dirname, "../__fixtures__/ludlow-rss.xml"), "utf-8");

describe("parseRss", () => {
  it("parses all items from fixture (no pre-limit)", () => {
    const items = parseRss(fixture);
    // fixture has 7 items; parseRss with no limit should return all of them
    expect(items.length).toBe(7);
  });
  it("maps title, link, published, image correctly", () => {
    const items = parseRss(fixture);
    expect(items[0].title).toBe("Flooding alert issued for Ludlow town centre");
    expect(items[0].link).toBe("https://www.ludlowadvertiser.co.uk/news/flooding-alert");
    expect(items[0].published).toBe("Mon, 23 Jun 2026 08:00:00 +0000");
    expect(items[0].image).toBe("https://example.com/img1.jpg");
  });
  it("respects limit parameter when provided", () => {
    const items = parseRss(fixture, 1);
    expect(items).toHaveLength(1);
  });
  it("normalises single-item feed to array", () => {
    const singleItemXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Test</title>
    <item>
      <title>Only Item</title>
      <link>https://example.com/only</link>
      <pubDate>Mon, 23 Jun 2026 08:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;
    const items = parseRss(singleItemXml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Only Item");
  });
  it("returns [] on garbage input", () => {
    expect(parseRss("not xml at all <><>")).toEqual([]);
    expect(parseRss("")).toEqual([]);
  });
});

describe("isRelevantNews", () => {
  const makeItem = (title: string, link = "https://example.com/news/item"): NewsItem => ({
    title,
    link,
    published: "Mon, 23 Jun 2026 08:00:00 +0000",
  });

  it("keeps a genuine local Ludlow item", () => {
    expect(isRelevantNews(makeItem("Ludlow Castle announces summer concert series"))).toBe(true);
  });

  it("drops a property listing even though it mentions a local area", () => {
    expect(
      isRelevantNews(makeItem("4-bedroom home for sale in Ludford guide price £450,000"))
    ).toBe(false);
  });

  it("drops a generic non-local item with no include term", () => {
    expect(
      isRelevantNews(makeItem("Royal Family news: latest updates from Buckingham Palace"))
    ).toBe(false);
  });

  it("drops a win/competition item even when it mentions Ludlow (exclude wins)", () => {
    expect(
      isRelevantNews(makeItem("Win a £100 voucher for your local Ludlow restaurant"))
    ).toBe(false);
  });

  it("drops a 'best places' clickbait item", () => {
    expect(isRelevantNews(makeItem("10 best places to visit this summer"))).toBe(false);
  });

  it("keeps a Craven Arms item", () => {
    expect(isRelevantNews(makeItem("Road closure planned for Craven Arms town centre"))).toBe(true);
  });

  it("drops an item with exclude phrase even when title is otherwise local", () => {
    expect(
      isRelevantNews(makeItem("Sponsored: Ludlow's best deals this week"))
    ).toBe(false);
  });

  it("is case-insensitive on exclude and include checks", () => {
    expect(isRelevantNews(makeItem("LUDLOW CASTLE plans renovation"))).toBe(true);
    expect(isRelevantNews(makeItem("WIN A £100 voucher in LUDLOW"))).toBe(false);
  });
});

describe("dedupeByTitle", () => {
  const makeItem = (title: string, link = "https://example.com"): NewsItem => ({
    title,
    link,
    published: "Mon, 23 Jun 2026 08:00:00 +0000",
  });

  it("returns a single item when two have the same title", () => {
    const items = [
      makeItem("Flooding alert issued for Ludlow town centre", "https://example.com/a"),
      makeItem("Flooding alert issued for Ludlow town centre", "https://example.com/b"),
    ];
    expect(dedupeByTitle(items)).toHaveLength(1);
  });

  it("keeps both when titles differ", () => {
    const items = [
      makeItem("Ludlow flooding update"),
      makeItem("Shropshire council announces new plan"),
    ];
    expect(dedupeByTitle(items)).toHaveLength(2);
  });

  it("dedupes case-insensitively and trims whitespace", () => {
    const items = [
      makeItem("  Ludlow Flooding Update  "),
      makeItem("ludlow flooding update"),
    ];
    expect(dedupeByTitle(items)).toHaveLength(1);
  });

  it("keeps the first occurrence and drops later duplicates", () => {
    const items = [
      makeItem("Ludlow news", "https://example.com/first"),
      makeItem("Ludlow news", "https://example.com/second"),
    ];
    const result = dedupeByTitle(items);
    expect(result[0].link).toBe("https://example.com/first");
  });

  it("returns empty array for empty input", () => {
    expect(dedupeByTitle([])).toEqual([]);
  });
});

describe("fetchNews filtering integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns only genuine local items after filtering and deduping fixture", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => fixture,
      })
    );

    // fixture has 7 items:
    // 1. "Flooding alert issued for Ludlow town centre" — local, passes
    // 2. "Ludlow Castle announces summer concert series" — local, passes
    // 3. "4-bedroom home for sale in Ludford guide price £450,000" — exclude (bedroom/for sale), drops
    // 4. "Win a £100 voucher for your local Ludlow restaurant" — exclude (win £), drops
    // 5. duplicate of item 1 — deduped, drops
    // 6. "10 best places to visit this summer" — exclude (best places), drops
    // 7. "Royal Family news: latest updates from Buckingham Palace" — no include term, drops
    const items = await fetchNews("https://example.com/rss");
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Flooding alert issued for Ludlow town centre");
    expect(items[1].title).toBe("Ludlow Castle announces summer concert series");
  });

  it("respects limit after filtering", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => fixture,
      })
    );

    const items = await fetchNews("https://example.com/rss", 1);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Flooding alert issued for Ludlow town centre");
  });
});

describe("isLocalNews (title + description)", () => {
  const make = (title: string, description?: string): NewsItem => ({
    title,
    description,
    link: "https://example.com/x",
    published: "Mon, 23 Jun 2026 08:00:00 +0000",
  });

  it("keeps an item whose locality is only in the description (terse BBC title)", () => {
    expect(isLocalNews(make("Man jailed for 20 years", "Sentenced at Ludlow Crown Court."))).toBe(true);
  });

  it("drops a Shropshire item that is not about the Ludlow area", () => {
    expect(isLocalNews(make("Swindon roadworks cause delays", "Traffic on the M4 near Swindon."))).toBe(false);
  });

  it("still applies the exclude list", () => {
    expect(isLocalNews(make("Win a £100 voucher in Ludlow"))).toBe(false);
  });
});

describe("fetchAllNews (merged feeds)", () => {
  beforeEach(() => vi.resetAllMocks());

  it("merges two feeds, dedupes, filters local, and sorts newest-first", async () => {
    const journal = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Ludlow Castle concert announced</title><link>https://j/1</link><pubDate>Mon, 22 Jun 2026 09:00:00 +0000</pubDate></item>
    </channel></rss>`;
    const bbc = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Man sentenced over city centre assault</title><description><![CDATA[Heard at Ludlow Crown Court.]]></description><link>https://b/1</link><pubDate>Wed, 24 Jun 2026 09:00:00 +0000</pubDate></item>
      <item><title>Generic UK story</title><description><![CDATA[Nothing local here.]]></description><link>https://b/2</link><pubDate>Wed, 24 Jun 2026 10:00:00 +0000</pubDate></item>
    </channel></rss>`;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => journal })
      .mockResolvedValueOnce({ ok: true, text: async () => bbc });

    const items = await fetchAllNews(["j", "b"], 8, fetchImpl as unknown as typeof fetch);
    expect(items.map((i) => i.title)).toEqual([
      "Man sentenced over city centre assault", // 24 Jun, newest, local via description
      "Ludlow Castle concert announced", // 22 Jun
    ]); // the "Generic UK story" is dropped (not local)
  });

  it("a failing feed does not break the other (fail-soft)", async () => {
    const journal = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Ludlow news item</title><link>https://j/1</link><pubDate>Mon, 22 Jun 2026 09:00:00 +0000</pubDate></item>
    </channel></rss>`;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => journal })
      .mockResolvedValueOnce({ ok: false, status: 503 });
    const items = await fetchAllNews(["j", "b"], 8, fetchImpl as unknown as typeof fetch);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Ludlow news item");
  });
});
