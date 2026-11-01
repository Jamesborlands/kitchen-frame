import { describe, it, expect } from "vitest";
import { initialsAmong } from "@/lib/initials";
import { boardSection, photosSection } from "@/lib/kitchen/feed/sections";

describe("the same person has the same initials everywhere", () => {
  it("a first name borrows the full name's initials when only one full name matches", () => {
    const i = initialsAmong(["Sam", "Sam Hart", "Kate", "Tom Smith", "tom"]);
    expect(i("Sam")).toBe("SH");
    expect(i("Sam Hart")).toBe("SH");
    expect(i("tom")).toBe("TS");
    expect(i("Kate")).toBe("KA"); // no full name to borrow from
  });

  it("two people sharing a first name: the first name alone stays as it was", () => {
    const i = initialsAmong(["Sam", "Sam Hart", "Sam Smith"]);
    expect(i("Sam")).toBe("SA");
  });

  it("photos and the message board agree", () => {
    const frame = {
      photos: [{ id: "p1", url: "/a", from: "Sam", at: 1 }, { id: "p2", url: "/b", from: "Sam Hart", at: 2 }],
      notes: [{ id: "n1", text: "hello", from: "Sam Hart", at: 3 }],
    };
    expect(photosSection(frame).map((p) => p.initials)).toEqual(["SH", "SH"]);
    expect(boardSection(frame.notes, frame.photos.map((p) => p.from))!.pages[0].initials).toBe("SH");
  });
});
