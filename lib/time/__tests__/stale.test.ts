import { describe, it, expect } from "vitest";
import { staleLabel } from "@/lib/time/stale";

const MIN = 60_000;
const now = Date.UTC(2026, 5, 23, 12);

describe("staleLabel", () => {
  it("is quiet for fresh or unknown data", () => {
    expect(staleLabel(undefined, now)).toBeNull();
    expect(staleLabel(now - 29 * MIN, now)).toBeNull();
  });
  it("counts minutes, then hours, then days", () => {
    expect(staleLabel(now - 45 * MIN, now)).toBe("updated 45 min ago");
    expect(staleLabel(now - 150 * MIN, now)).toBe("updated 2h ago");
    expect(staleLabel(now - 3 * 24 * 60 * MIN, now)).toBe("updated 3 days ago");
  });
});
