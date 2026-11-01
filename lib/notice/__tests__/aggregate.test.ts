import { describe, it, expect } from "vitest";
import { aggregateNotices } from "@/lib/notice/aggregate";
import { buildContext, type NoticeSource } from "@/lib/notice/card";

const ctx = buildContext(new Date("2026-06-24T12:00:00Z"));
const src = (priority: number, id: string): NoticeSource => async () => [
  { id, kind: "delight", label: "x", title: id, priority },
];

describe("aggregateNotices", () => {
  it("sorts by priority desc and caps at 6", async () => {
    const sources = [src(10, "a"), src(80, "b"), src(30, "c")];
    const cards = await aggregateNotices(ctx, fetch, sources);
    expect(cards.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("a throwing source does not break the rest (fail-soft)", async () => {
    const boom: NoticeSource = async () => { throw new Error("nope"); };
    const cards = await aggregateNotices(ctx, fetch, [boom, src(50, "ok")]);
    expect(cards.map((c) => c.id)).toEqual(["ok"]);
  });

  it("genuinely exercises the 6-card cap with 8 sources", async () => {
    const many = Array.from({ length: 8 }, (_, n) => src(100 - n * 5, `c${n}`));
    const cards = await aggregateNotices(ctx, fetch, many);
    expect(cards).toHaveLength(6);
    expect(cards.map((c) => c.id)).toEqual(["c0", "c1", "c2", "c3", "c4", "c5"]);
  });

  it("returns the fallback card when every source returns []", async () => {
    const cards = await aggregateNotices(ctx, fetch, [async () => [], async () => []]);
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("notice-fallback");
  });

  it("returns the fallback card when every source throws", async () => {
    const boom: NoticeSource = async () => { throw new Error("x"); };
    const cards = await aggregateNotices(ctx, fetch, [boom]);
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("notice-fallback");
  });
});
