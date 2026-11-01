import { describe, it, expect } from "vitest";
import { familyCards, familySource } from "@/lib/notice/sources/family";
import { buildContext } from "@/lib/notice/card";
import type { Occasion } from "@/lib/occasions";

const people: Occasion[] = [
  { name: "Peter", month: 10, day: 16, kind: "birthday", year: 1960 },
  { name: "Kate", month: 5, day: 12, kind: "birthday", year: 1990 },
  { name: "Anne & Peter", month: 10, day: 11, kind: "anniversary", year: 1990 },
];

describe("familyCards", () => {
  it("counts down birthdays within two weeks, with the age", () => {
    const cards = familyCards(people, new Date("2026-10-11T12:00:00Z"));
    const peter = cards.find((c) => c.title.startsWith("Peter"))!;
    expect(peter).toMatchObject({ kind: "family", label: "family", title: "Peter's birthday is in 5 days — 66!" });
    expect(cards.some((c) => c.title.includes("Kate"))).toBe(false); // May is too far off
  });

  it("celebrates on the day, and lists anniversaries", () => {
    const cards = familyCards(people, new Date("2026-10-11T12:00:00Z"));
    expect(cards.find((c) => c.title.includes("anniversary"))!.title).toBe("Happy anniversary, Anne & Peter — 36 years today!");
  });

  it("says tomorrow, and ranks the final week above everyday cards", () => {
    const [c] = familyCards(people, new Date("2026-10-15T12:00:00Z"));
    expect(c.title).toBe("Peter's birthday is tomorrow — 66!");
    expect(c.priority).toBeGreaterThanOrEqual(70);
    const [far] = familyCards(people, new Date("2026-10-04T12:00:00Z")); // 12 days out
    expect(far.priority).toBeLessThan(70);
  });
});

describe("familySource", () => {
  it("uses the birthdays saved on /family when there are some", async () => {
    const ctx = { ...buildContext(new Date("2026-10-11T12:00:00Z")), occasions: [{ name: "Gran", month: 10, day: 13, kind: "birthday" as const }] };
    expect((await familySource(ctx)).map((c) => c.title)).toEqual(["Gran's birthday is in 2 days"]);
  });
});
