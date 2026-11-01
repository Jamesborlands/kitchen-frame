import { describe, it, expect } from "vitest";
import { marketStatus } from "@/lib/content/market";

// Ludlow Market: Mon, Wed, Fri & Sat, 9am–4pm.

// 2026-06-22 = Monday
describe("Monday 2026-06-22", () => {
  const mon = new Date("2026-06-22T10:00:00Z");
  it("onToday is true", () => {
    expect(marketStatus(mon).onToday).toBe(true);
  });
  it("todayLabel mentions 4pm", () => {
    expect(marketStatus(mon).todayLabel).toContain("4pm");
  });
  it("nextLabel mentions Wednesday", () => {
    expect(marketStatus(mon).nextLabel).toMatch(/wednesday/i);
  });
});

// 2026-06-27 = Saturday
describe("Saturday 2026-06-27", () => {
  const sat = new Date("2026-06-27T10:00:00Z");
  it("onToday is true", () => {
    expect(marketStatus(sat).onToday).toBe(true);
  });
  it("todayLabel mentions 4pm", () => {
    expect(marketStatus(sat).todayLabel).toContain("4pm");
  });
  it("nextLabel mentions Monday", () => {
    expect(marketStatus(sat).nextLabel).toMatch(/monday/i);
  });
});

// 2026-06-23 = Tuesday
describe("Tuesday 2026-06-23", () => {
  const tue = new Date("2026-06-23T10:00:00Z");
  it("onToday is false", () => {
    expect(marketStatus(tue).onToday).toBe(false);
  });
  it("todayLabel is null", () => {
    expect(marketStatus(tue).todayLabel).toBeNull();
  });
  it("nextLabel mentions Wednesday", () => {
    expect(marketStatus(tue).nextLabel).toMatch(/wednesday/i);
  });
});

// 2026-06-25 = Thursday
describe("Thursday 2026-06-25", () => {
  const thu = new Date("2026-06-25T10:00:00Z");
  it("onToday is false", () => {
    expect(marketStatus(thu).onToday).toBe(false);
  });
  it("nextLabel mentions Friday", () => {
    expect(marketStatus(thu).nextLabel).toMatch(/friday/i);
  });
});

// 2026-06-28 = Sunday
describe("Sunday 2026-06-28", () => {
  const sun = new Date("2026-06-28T10:00:00Z");
  it("onToday is false", () => {
    expect(marketStatus(sun).onToday).toBe(false);
  });
  it("nextLabel mentions Monday", () => {
    expect(marketStatus(sun).nextLabel).toMatch(/monday/i);
  });
});
