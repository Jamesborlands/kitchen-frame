import { describe, it, expect } from "vitest";
import { moonPhase } from "@/lib/time/moon";

const REF = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC — new moon epoch
const SYNODIC = 29.530588853;
const DAY_MS = 86_400_000;

describe("moonPhase", () => {
  it("returns ageDays ≈ 0, illumination ≈ 0, name 'new moon' at the reference epoch", () => {
    const result = moonPhase(new Date(REF));
    expect(result.ageDays).toBeCloseTo(0, 1);
    expect(result.illumination).toBeCloseTo(0, 2);
    expect(result.name).toBe("new moon");
  });

  it("returns illumination ≈ 1 and name 'full moon' at epoch + SYNODIC/2", () => {
    const fullMoonMs = REF + (SYNODIC / 2) * DAY_MS;
    const result = moonPhase(new Date(fullMoonMs));
    expect(result.illumination).toBeCloseTo(1, 2);
    expect(result.name).toBe("full moon");
  });

  it("returns illumination ≈ 0.5 and name 'first quarter' at epoch + SYNODIC/4", () => {
    const quarterMs = REF + (SYNODIC / 4) * DAY_MS;
    const result = moonPhase(new Date(quarterMs));
    expect(result.illumination).toBeCloseTo(0.5, 1);
    expect(result.name).toBe("first quarter");
  });

  it("returns name 'last quarter' at epoch + 3*SYNODIC/4", () => {
    const lastQuarterMs = REF + (3 * SYNODIC / 4) * DAY_MS;
    const result = moonPhase(new Date(lastQuarterMs));
    expect(result.name).toBe("last quarter");
  });

  it("returns a valid ageDays in 0..SYNODIC for a date before the epoch", () => {
    const beforeEpoch = new Date(REF - 10 * DAY_MS); // 10 days before
    const result = moonPhase(beforeEpoch);
    expect(result.ageDays).toBeGreaterThanOrEqual(0);
    expect(result.ageDays).toBeLessThan(SYNODIC);
  });

  it("ageDays is always in [0, SYNODIC) regardless of input", () => {
    const dates = [
      new Date(0),
      new Date(REF - 1000 * DAY_MS),
      new Date(REF),
      new Date(REF + 500 * DAY_MS),
    ];
    for (const d of dates) {
      const { ageDays } = moonPhase(d);
      expect(ageDays).toBeGreaterThanOrEqual(0);
      expect(ageDays).toBeLessThan(SYNODIC);
    }
  });
});
