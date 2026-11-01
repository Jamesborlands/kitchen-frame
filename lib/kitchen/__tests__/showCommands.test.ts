import { describe, it, expect } from "vitest";
import { isCommand, SHOW_PANELS } from "@/lib/kitchen/opsTypes";

describe("remote 'show me a panel' commands", () => {
  it("each panel can be opened from /kitchen/status (the frame opens it, screenshots it, closes it)", () => {
    expect(SHOW_PANELS).toEqual(["weather", "calendar", "todo", "rides", "messages", "settings", "wifi"]);
    for (const p of SHOW_PANELS) expect(isCommand(`show-${p}`)).toBe(true);
    expect(isCommand("show-nonsense")).toBe(false);
  });
});
