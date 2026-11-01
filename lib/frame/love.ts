import { GRAPH_API } from "@/lib/frame/media";
import type { FramePhoto } from "@/lib/frame/store";

// A ❤️ from the kitchen lands as a WhatsApp reaction on the sender's original
// photo message. WhatsApp only lets a business number send to someone within
// 24 hours of their last message to it, so a photo can be loved for a day after
// it arrives (the photo itself is that last message), and only once.

export const LOVE_WINDOW_MS = 24 * 60 * 60_000;
export const LOVE_EMOJI = "❤️";

export interface LoveConfig {
  token?: string;          // WHATSAPP_TOKEN
  phoneNumberId?: string;  // WHATSAPP_PHONE_NUMBER_ID
}

export function loveConfig(env: NodeJS.ProcessEnv = process.env): LoveConfig {
  return { token: env.WHATSAPP_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID };
}

export function loveEnabled(cfg: LoveConfig): boolean {
  return Boolean(cfg.token && cfg.phoneNumberId);
}

export function canLove(photo: FramePhoto, now: number): boolean {
  return Boolean(
    photo.waFrom && photo.waMessageId && !photo.lovedAt && now - photo.at < LOVE_WINDOW_MS,
  );
}

/** What the browser sees: no phone numbers, just whether a heart is possible. */
export type FramePhotoView = Omit<FramePhoto, "waFrom" | "waMessageId" | "lovedAt"> & {
  lovable: boolean;
  loved: boolean;
};

export function toPhotoView(photo: FramePhoto, now: number, enabled: boolean): FramePhotoView {
  return {
    id: photo.id,
    url: photo.url,
    from: photo.from,
    caption: photo.caption,
    at: photo.at,
    lovable: enabled && canLove(photo, now),
    loved: Boolean(photo.lovedAt),
  };
}

export async function sendLove(
  photo: FramePhoto,
  cfg: LoveConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!loveEnabled(cfg) || !photo.waFrom || !photo.waMessageId) return false;
  const res = await fetchImpl(`${GRAPH_API}/${cfg.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: photo.waFrom,
      type: "reaction",
      reaction: { message_id: photo.waMessageId, emoji: LOVE_EMOJI },
    }),
  });
  return res.ok;
}
