// The frame's Settings panel: a QR code for the family page, its link, and the
// household's WhatsApp number — so whoever's in the kitchen always knows where
// to send photos and how to manage the frame.
import qrcode from "qrcode-generator";
import { bindings } from "@/lib/cloudflare/bindings";
import { GRAPH_API } from "@/lib/frame/media";

export interface FeedShare {
  url: string;          // the family page
  urlLabel: string;     // the same, without https:// (to read out)
  whatsapp: string | null; // "+1 555-010-0199"; null until the household has a number
  qr: string[];         // the QR code as rows of "1" (dark) and "0" (light)
}

export function qrRows(text: string): string[] {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (q.isDark(r, c) ? "1" : "0")).join(""));
}

export function formatWhatsAppNumber(n: string): string {
  const t = n.trim();
  return t.startsWith("+") ? t : `+${t.replace(/\s+/g, "")}`;
}

export async function shareSection(
  origin: string,
  phoneNumberId: string | null,
  lookup: (id: string) => Promise<string | null>,
): Promise<FeedShare> {
  const url = `${origin.replace(/\/$/, "")}/family`;
  const number = phoneNumberId ? await lookup(phoneNumberId).catch(() => null) : null;
  return { url, urlLabel: url.replace(/^https?:\/\//, ""), whatsapp: number ? formatWhatsAppNumber(number) : null, qr: qrRows(url) };
}

/** The number people see in WhatsApp for a Meta phone number id (kept a day in KV). */
export async function displayNumber(phoneNumberId: string): Promise<string | null> {
  const kv = bindings().FRAME;
  const key = `wa:display:${phoneNumberId}`;
  const kept = kv ? ((await kv.get(key, "json")) as { n: string } | null) : null;
  if (kept?.n) return kept.n;
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return null;
  const res = await fetch(`${GRAPH_API}/${phoneNumberId}?fields=display_phone_number`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const n = ((await res.json()) as { display_phone_number?: string }).display_phone_number ?? null;
  if (n && kv) await kv.put(key, JSON.stringify({ n }), { expirationTtl: 86_400 });
  return n;
}
