import { describe, it, expect, vi } from "vitest";
import { bbcTopSource, localNewsSource } from "@/lib/notice/sources/news";
import { buildContext } from "@/lib/notice/card";

const ctx = buildContext(new Date("2026-10-11T12:00:00Z"));

function rss(items: { title: string; link?: string }[]): string {
  return `<?xml version="1.0"?><rss><channel>${items
    .map((i) => `<item><title>${i.title}</title><link>${i.link ?? "https://x/1"}</link><pubDate>Sun, 11 Oct 2026 10:00:00 GMT</pubDate></item>`)
    .join("")}</channel></rss>`;
}
const ok = (body: string) => ({ ok: true, text: async () => body }) as unknown as Response;

describe("bbcTopSource", () => {
  it("shows the top BBC headline, skipping live blogs and videos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(rss([
      { title: "Live: Day two of the summit" },
      { title: "Watch: A dog surfs" },
      { title: "Bank of England holds rates", link: "https://bbc.co.uk/news/1" },
    ])));
    const cards = await bbcTopSource(ctx, fetchMock as unknown as typeof fetch);
    expect(fetchMock.mock.calls[0][0]).toBe("https://feeds.bbci.co.uk/news/rss.xml");
    expect(cards).toEqual([
      expect.objectContaining({ kind: "news", label: "bbc news", title: "Bank of England holds rates", href: "https://bbc.co.uk/news/1" }),
    ]);
  });

  it("is empty when the feed fails", async () => {
    const cards = await bbcTopSource(ctx, vi.fn().mockRejectedValue(new Error("down")) as unknown as typeof fetch);
    expect(cards).toEqual([]);
  });
});

describe("localNewsSource", () => {
  it("shows the top Ludlow-area story", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(rss([
      { title: "Election results in Leeds" },
      { title: "Ludlow Castle wall repairs finish", link: "https://sj/2" },
    ])));
    const cards = await localNewsSource(ctx, fetchMock as unknown as typeof fetch);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ kind: "news", label: "ludlow news", title: "Ludlow Castle wall repairs finish" });
  });

  it("is empty when nothing local is in the feeds", async () => {
    const cards = await localNewsSource(ctx, vi.fn().mockResolvedValue(ok(rss([{ title: "Leeds news" }]))) as unknown as typeof fetch);
    expect(cards).toEqual([]);
  });
});
