import { describe, it, expect } from "vitest";
import { frameKeyAllows, safeEqual, FRAME_KEY_PATHS } from "@/lib/kitchen/frameKey";

const KEY = "k".repeat(43);

describe("safeEqual", () => {
  it("matches equal strings only", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("frameKeyAllows", () => {
  it("opens every frame path with the right key", () => {
    for (const p of FRAME_KEY_PATHS) {
      expect(frameKeyAllows(p, `Bearer ${KEY}`, KEY)).toBe(true);
    }
  });

  it("is off when FRAME_KEY is unset or empty", () => {
    expect(frameKeyAllows("/api/kitchen/feed", `Bearer ${KEY}`, undefined)).toBe(false);
    expect(frameKeyAllows("/api/kitchen/feed", "Bearer ", "")).toBe(false);
  });

  it("rejects wrong, short, long, unprefixed and missing keys", () => {
    expect(frameKeyAllows("/api/kitchen/feed", `Bearer ${KEY}x`, KEY)).toBe(false);
    expect(frameKeyAllows("/api/kitchen/feed", `Bearer ${KEY.slice(1)}`, KEY)).toBe(false);
    expect(frameKeyAllows("/api/kitchen/feed", KEY, KEY)).toBe(false);
    expect(frameKeyAllows("/api/kitchen/feed", `bearer ${KEY}`, KEY)).toBe(false);
    expect(frameKeyAllows("/api/kitchen/feed", null, KEY)).toBe(false);
  });

  it("never opens PIN-only or look-alike paths", () => {
    for (const p of ["/kitchen", "/kitchen/status", "/api/kitchen/status", "/api/kitchen/command",
      "/api/kitchen/debug", "/api/kitchen/feedback", "/api/photos", "/api/frame", "/"]) {
      expect(frameKeyAllows(p, `Bearer ${KEY}`, KEY)).toBe(false);
    }
  });

  it("opens the frame's photo list and its remove button, and nothing else of /family", () => {
    expect(frameKeyAllows("/api/kitchen/photos", `Bearer ${KEY}`, KEY)).toBe(true);
    expect(frameKeyAllows("/api/kitchen/photos/remove", `Bearer ${KEY}`, KEY)).toBe(true);
    for (const p of ["/api/family", "/api/family/item", "/api/family/settings", "/family"]) {
      expect(frameKeyAllows(p, `Bearer ${KEY}`, KEY)).toBe(false);
    }
  });
});

