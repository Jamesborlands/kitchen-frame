import { describe, it, expect, vi } from "vitest";
import { requiredKp, maxKpNext24h, auroraSource } from "@/lib/notice/sources/aurora";
import { buildContext } from "@/lib/notice/card";
import { FAMILY_LOCATIONS } from "@/lib/config";

describe("requiredKp", () => {
  it("is low for Edinburgh, high for Ludlow, never for low latitudes", () => {
    expect(requiredKp(55.95)).toBe(5);
    expect(requiredKp(52.37)).toBe(6);
    expect(requiredKp(36.97)).toBeGreaterThan(9);
  });
});

describe("maxKpNext24h", () => {
  it("returns the max kp within 24h of now", () => {
    const now = new Date("2026-06-24T00:00:00Z");
    const rows = [
      { time_tag: "2026-06-24T03:00:00", kp: 6 },
      { time_tag: "2026-06-26T03:00:00", kp: 9 }, // outside window
    ];
    expect(maxKpNext24h(rows, now)).toBe(6);
  });
});

describe("auroraSource", () => {
  const ctx = buildContext(new Date("2026-06-24T00:00:00Z"), FAMILY_LOCATIONS);

  it("emits a card for Edinburgh when Kp is high enough, none for low latitudes", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ time_tag: "2026-06-24T03:00:00", kp: 6 }],
    });
    const cards = await auroraSource(ctx, fetchImpl as unknown as typeof fetch);
    expect(cards.some((c) => c.label.includes("edinburgh"))).toBe(true);
    expect(cards.every((c) => c.kind === "aurora" && c.priority === 60)).toBe(true);
    // Santa Cruz / Queenstown never qualify
    expect(cards.some((c) => c.label.includes("santa cruz"))).toBe(false);
  });

  it("returns [] when Kp is quiet", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ time_tag: "2026-06-24T03:00:00", kp: 2 }] });
    expect(await auroraSource(ctx, fetchImpl as unknown as typeof fetch)).toEqual([]);
  });
});
