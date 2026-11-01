import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseEventsRss,
  isRelevantEvent,
  fetchEvents,
  type EventItem,
} from "@/lib/sources/events";
import { readFileSync } from "fs";
import { join } from "path";

const fixture = readFileSync(join(__dirname, "../__fixtures__/ludlow-leisure-rss.xml"), "utf-8");

describe("parseEventsRss", () => {
  it("parses all items from fixture (no pre-limit)", () => {
    expect(parseEventsRss(fixture)).toHaveLength(8);
  });
  it("maps title, link, published, image and description", () => {
    const items = parseEventsRss(fixture);
    expect(items[0].title).toBe("Ludlow Castle to host free summer music events in its grounds");
    expect(items[0].link).toBe("https://www.ludlowadvertiser.co.uk/news/castle-summer-music/?ref=rss");
    expect(items[0].published).toBe("Wed, 24 Jun 2026 17:00:00 +0100");
    expect(items[0].image).toBe("https://example.com/castle.jpg");
    expect(items[0].description).toBe(
      "A series of free outdoor concerts will run through July in the castle grounds."
    );
  });
  it("leaves image and description undefined when absent", () => {
    const items = parseEventsRss(fixture);
    const edwina = items.find((i) => i.title.includes("Edwina Hayes"))!;
    expect(edwina.image).toBeUndefined();
    expect(edwina.description).toBe("An intimate evening of folk at the venue next month.");
  });
  it("respects limit parameter when provided", () => {
    expect(parseEventsRss(fixture, 2)).toHaveLength(2);
  });
  it("normalises a single-item feed to an array", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><item>
      <title>Only Event</title><link>https://example.com/only</link>
      <pubDate>Mon, 23 Jun 2026 08:00:00 +0000</pubDate></item></channel></rss>`;
    const items = parseEventsRss(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Only Event");
  });
  it("returns [] on garbage input", () => {
    expect(parseEventsRss("not xml <><>")).toEqual([]);
    expect(parseEventsRss("")).toEqual([]);
  });
});

describe("isRelevantEvent", () => {
  const make = (title: string, description = ""): EventItem => ({
    title,
    description,
    link: "https://example.com/e",
    published: "Mon, 23 Jun 2026 08:00:00 +0000",
  });

  it("keeps a genuine local event", () => {
    expect(isRelevantEvent(make("Ludlow Castle summer concert series"))).toBe(true);
  });
  it("keeps an event matched by venue in the title", () => {
    expect(isRelevantEvent(make("Edwina Hayes brings folk night to the Assembly Rooms"))).toBe(true);
  });
  it("keeps an event whose locality is only in the description", () => {
    expect(isRelevantEvent(make("New cafe with workshops opens", "On Corve Street in Ludlow."))).toBe(true);
  });
  it("drops a national soap-opera schedule item", () => {
    expect(isRelevantEvent(make("Emmerdale and Coronation Street TV schedule changes this week"))).toBe(false);
  });
  it("drops a supermarket promo even if a café is mentioned", () => {
    expect(isRelevantEvent(make("Morrisons launches huge breakfast for £12 in cafés"))).toBe(false);
  });
  it("drops a non-local item with no local term", () => {
    expect(isRelevantEvent(make("Popular US fast food chain set to launch in the UK"))).toBe(false);
  });
  it("is case-insensitive", () => {
    expect(isRelevantEvent(make("LUDLOW ASSEMBLY ROOMS announces new season"))).toBe(true);
  });
});

describe("fetchEvents filtering integration", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns only genuine local events after filtering and deduping the fixture", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => fixture }));
    const items = await fetchEvents("https://example.com/rss");
    expect(items.map((i) => i.title)).toEqual([
      "Ludlow Castle to host free summer music events in its grounds",
      "Former Bake-Off presenter Sue Perkins announces Ludlow show",
      "Edwina Hayes brings 'the sweetest voice in England' to the Assembly Rooms",
      "New cafe with art, flowers and creative workshops opens",
    ]);
  });

  it("respects the limit after filtering", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => fixture }));
    const items = await fetchEvents("https://example.com/rss", 2);
    expect(items).toHaveLength(2);
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => "" }));
    await expect(fetchEvents("https://example.com/rss")).rejects.toThrow();
  });
});
