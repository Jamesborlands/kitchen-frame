import { ingestWhatsAppPhoto } from "@/lib/frame/media";
import { frameStore, householdForWhatsApp } from "@/lib/households/data";

// Meta Cloud API webhook for WhatsApp inbound messages.
// Each message goes to the household that owns the number it was sent to
// (value.metadata.phone_number_id). Text notes are stored immediately. Photos are downloaded from the Meta Cloud
// API and uploaded to Vercel Blob when WHATSAPP_TOKEN + BLOB_READ_WRITE_TOKEN
// are configured; otherwise they fall back to a lightweight placeholder note.

// ---- Types for Meta Cloud API payload ----
interface MetaContact {
  profile: { name: string };
  wa_id: string;
}

interface MetaTextMessage {
  type: "text";
  from: string;
  id: string;
  text: { body: string };
}

interface MetaImageMessage {
  type: "image";
  from: string;
  id: string;
  image: { id: string; caption?: string; mime_type: string; sha256: string };
}

type MetaMessage = MetaTextMessage | MetaImageMessage | { type: string; from: string; id: string };

interface MetaValue {
  metadata?: { phone_number_id?: string };
  messages?: MetaMessage[];
  contacts?: MetaContact[];
}

interface MetaChange {
  value: MetaValue;
}

interface MetaEntry {
  changes: MetaChange[];
}

interface MetaPayload {
  entry: MetaEntry[];
}

// ---- Webhook verification helper (pure, exported for testing) ----
// Returns the challenge string when all conditions pass, otherwise null.
export function verifyChallenge(
  params: URLSearchParams,
  envToken: string | undefined
): string | null {
  if (!envToken) return null;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && token === envToken && challenge) {
    return challenge;
  }
  return null;
}

// ---- GET: Meta webhook verification ----
export function GET(request: Request): Response {
  const url = new URL(request.url);
  const challenge = verifyChallenge(url.searchParams, process.env.WHATSAPP_VERIFY_TOKEN);
  if (challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

// ---- Signature: Meta signs each call with the app secret (X-Hub-Signature-256) ----
async function signedByMeta(body: string, header: string | null, secret: string): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  const want = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  const got = header.slice("sha256=".length).toLowerCase();
  let diff = want.length ^ got.length;
  for (let i = 0; i < Math.max(want.length, got.length); i++) diff |= (want.charCodeAt(i) || 0) ^ (got.charCodeAt(i) || 0);
  return diff === 0;
}

// ---- POST: inbound WhatsApp messages ----
export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  // With WHATSAPP_APP_SECRET set, only calls Meta signed are taken (anyone can POST here).
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret && !(await signedByMeta(body, request.headers.get("x-hub-signature-256"), appSecret))) {
    return Response.json({ error: "bad signature" }, { status: 401 });
  }
  try {
    // Single typed cast at the JSON parse boundary — only `any` in this file.
    const raw = JSON.parse(body) as MetaPayload;

    const allowed = process.env.WHATSAPP_ALLOWED
      ? new Set(process.env.WHATSAPP_ALLOWED.split(",").map((n) => n.trim()))
      : null;

    for (const entry of raw.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const contacts: MetaContact[] = value.contacts ?? [];
        const household = await householdForWhatsApp(value.metadata?.phone_number_id);
        if (!household) {
          console.error("whatsapp: no household for number", value.metadata?.phone_number_id);
          continue;
        }

        for (const message of value.messages ?? []) {
          // each message on its own: one failing (a refused KV write, a media
          // download) mustn't drop the rest of an album
          try {
            await handleMessage(message, contacts, allowed, household);
          } catch (err) {
            console.error("whatsapp message failed", err instanceof Error ? err.message : err);
          }
        }
      }
    }
  } catch {
    // Swallow parse/processing errors — Meta requires a fast 200
  }

  return Response.json({ ok: true });
}

async function handleMessage(message: MetaMessage, contacts: MetaContact[], allowed: Set<string> | null, household: string): Promise<void> {
  const store = frameStore(household);
  const sender = message.from;

  // Allowlist check
  if (allowed && !allowed.has(sender)) return;

  const contact = contacts.find((c) => c.wa_id === sender);
  const fromName = contact?.profile?.name ?? sender;

  if (message.type === "text") {
    const textMsg = message as MetaTextMessage;
    await store.addNote({ text: textMsg.text.body.slice(0, 500), from: fromName.slice(0, 50) });
  } else if (message.type === "image") {
    const imgMsg = message as MetaImageMessage;
    const caption = imgMsg.image.caption;

    // Download + store the photo when blob storage is configured;
    // otherwise fall back to a lightweight note so the frame still
    // shows that something arrived.
    const stored = await ingestWhatsAppPhoto(imgMsg.image, fromName, {}, {
      waFrom: sender,
      waMessageId: imgMsg.id,
    }, household);
    if (!stored) {
      await store.addNote({
        text: caption ? `📷 ${caption.slice(0, 496)}` : "sent a photo",
        from: fromName.slice(0, 50),
      });
    }
  }
}
