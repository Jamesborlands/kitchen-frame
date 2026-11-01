import { describe, it, expect, vi } from "vitest";
import { canLove, loveEnabled, sendLove, toPhotoView, LOVE_WINDOW_MS } from "@/lib/frame/love";
import type { FramePhoto } from "@/lib/frame/store";

const now = Date.UTC(2026, 5, 23, 12);
const photo: FramePhoto = {
  id: "p1", url: "/a.webp", from: "Kate", at: now - 60_000,
  waFrom: "447700900000", waMessageId: "wamid.1",
};
const cfg = { token: "tok", phoneNumberId: "123" };

describe("canLove", () => {
  it("allows a recent WhatsApp photo", () => {
    expect(canLove(photo, now)).toBe(true);
  });
  it("refuses once WhatsApp's 24-hour window has passed", () => {
    expect(canLove({ ...photo, at: now - LOVE_WINDOW_MS }, now)).toBe(false);
  });
  it("refuses photos already loved, or without WhatsApp ids", () => {
    expect(canLove({ ...photo, lovedAt: now }, now)).toBe(false);
    expect(canLove({ ...photo, waMessageId: undefined }, now)).toBe(false);
  });
});

describe("loveEnabled", () => {
  it("needs both the token and the phone number id", () => {
    expect(loveEnabled(cfg)).toBe(true);
    expect(loveEnabled({ token: "tok" })).toBe(false);
  });
});

describe("toPhotoView", () => {
  it("never passes phone numbers to the browser", () => {
    const view = toPhotoView(photo, now, true);
    expect(view).not.toHaveProperty("waFrom");
    expect(view).not.toHaveProperty("waMessageId");
    expect(view).toMatchObject({ id: "p1", lovable: true, loved: false });
  });
  it("isn't lovable when sending isn't set up", () => {
    expect(toPhotoView(photo, now, false).lovable).toBe(false);
  });
  it("shows a photo that was already loved", () => {
    expect(toPhotoView({ ...photo, lovedAt: now }, now, true)).toMatchObject({ lovable: false, loved: true });
  });
});

describe("sendLove", () => {
  it("posts a ❤️ reaction to the original message", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    expect(await sendLove(photo, cfg, fetchImpl as unknown as typeof fetch)).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/graph\.facebook\.com\/v[\d.]+\/123\/messages$/);
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "447700900000",
      type: "reaction",
      reaction: { message_id: "wamid.1", emoji: "❤️" },
    });
  });
  it("reports a refusal from WhatsApp", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false });
    expect(await sendLove(photo, cfg, fetchImpl as unknown as typeof fetch)).toBe(false);
  });
  it("doesn't call out when not configured", async () => {
    const fetchImpl = vi.fn();
    expect(await sendLove(photo, {}, fetchImpl as unknown as typeof fetch)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
