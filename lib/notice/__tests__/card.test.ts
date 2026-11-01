import { describe, it, expect } from "vitest";
import { buildContext } from "@/lib/notice/card";

describe("buildContext", () => {
  it("derives the London month/day and carries locations", () => {
    // 2026-06-24T23:30:00Z is 00:30 on 25 June in London (BST, UTC+1)
    const ctx = buildContext(new Date("2026-06-24T23:30:00Z"));
    expect(ctx.month).toBe(6);
    expect(ctx.day).toBe(25);
    expect(ctx.locations.length).toBeGreaterThan(0);
  });
});
