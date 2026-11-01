import { describe, it, expect, vi } from "vitest";
import { qrRows, shareSection, formatWhatsAppNumber } from "@/lib/kitchen/share";

describe("the frame's Settings panel: where to send things", () => {
  it("a QR code as rows of 1s and 0s, square, with the three finder squares", () => {
    const rows = qrRows("https://cottage-view.example.workers.dev/family");
    expect(rows.length).toBeGreaterThanOrEqual(21);
    for (const r of rows) expect(r).toMatch(new RegExp(`^[01]{${rows.length}}$`));
    expect(rows[0].slice(0, 7)).toBe("1111111"); // top-left finder
    expect(rows[0].slice(-7)).toBe("1111111");   // top-right finder
    expect(rows[rows.length - 1].slice(0, 7)).toBe("1111111");
  });

  it("the family page link and the household's WhatsApp number", async () => {
    const lookup = vi.fn(async () => "+1 555-010-0199");
    const s = await shareSection("https://cottage-view.example.workers.dev", "100000000000001", lookup);
    expect(s.url).toBe("https://cottage-view.example.workers.dev/family");
    expect(s.urlLabel).toBe("cottage-view.example.workers.dev/family");
    expect(s.whatsapp).toBe("+1 555-010-0199");
    expect(s.qr.length).toBeGreaterThanOrEqual(21);
  });

  it("no number yet, or the lookup fails: just the link", async () => {
    expect((await shareSection("https://x.dev", null, async () => "+1")).whatsapp).toBeNull();
    expect((await shareSection("https://x.dev", "1", async () => { throw new Error("down"); })).whatsapp).toBeNull();
  });

  it("formats Meta's number nicely", () => {
    expect(formatWhatsAppNumber("+1 555-010-0199")).toBe("+1 555-010-0199");
    expect(formatWhatsAppNumber("15556764581")).toBe("+15556764581");
  });
});
