import { describe, it, expect } from "vitest";
import { wrapText, paginate } from "@/lib/frame/boardText";

describe("wrapText", () => {
  it("wraps on word boundaries within the column width", () => {
    expect(wrapText("the quick brown fox", 9)).toEqual(["the quick", "brown fox"]);
  });

  it("honours explicit newlines", () => {
    expect(wrapText("hello\n- sam", 20)).toEqual(["hello", "- sam"]);
  });

  it("hard-breaks a single word longer than the board", () => {
    expect(wrapText("supercalifragilistic", 8)).toEqual(["supercal", "ifragili", "stic"]);
  });
});

describe("paginate", () => {
  it("keeps a short message on a single page", () => {
    expect(paginate("miss you all x\n- kate", 18, 2)).toEqual(["miss you all x\n- kate"]);
  });

  it("splits a long message into board-sized pages, losing nothing", () => {
    const text = "thinking of you both hope the garden is lovely\n- kate";
    const pages = paginate(text, 18, 2);
    expect(pages.length).toBeGreaterThan(1);
    // every wrapped line appears across the pages, in order, nothing dropped
    const rejoined = pages.join("\n").split("\n");
    expect(rejoined).toEqual(wrapText(text, 18));
  });

  it("always keeps the signature when the message fits in the page budget", () => {
    const text = "one two three four five six seven eight\n- tom";
    const pages = paginate(text, 18, 2, 4);
    expect(pages.join(" ")).toContain("- tom");
  });

  it("marks an over-budget message with an ellipsis instead of a silent cut", () => {
    const huge = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const pages = paginate(huge, 18, 2, 3);
    expect(pages).toHaveLength(3);
    expect(pages[pages.length - 1].endsWith("…")).toBe(true);
  });

  it("never returns an empty array", () => {
    expect(paginate("", 18, 2)).toEqual([""]);
  });

  it("never leaves the signature alone on the last page (widow control)", () => {
    // content wraps to exactly 2 lines, then "- sam" would orphan onto page 2
    const pages = paginate("hello there my dear friend\n- sam", 18, 2);
    const lastPage = pages[pages.length - 1];
    expect(lastPage).toContain("- sam");
    // the signature shares its page with at least one other line
    expect(lastPage.split("\n").length).toBeGreaterThan(1);
  });
});
