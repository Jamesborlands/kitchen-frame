// The frame's link home: its 10-minute check-in (stored, latest only), one
// pending remote command (delivered exactly once, then cleared), and when it
// last uploaded a screenshot/log. Workers KV `FRAME` in production; an
// in-memory map locally and in tests.
import { bindings } from "@/lib/cloudflare/bindings";
import { isCommand, type Checkin, type DebugKind, type DebugMeta, type FrameCommand, type StoredCheckin } from "@/lib/kitchen/opsTypes";

export * from "@/lib/kitchen/opsTypes";

export const DEBUG_KEYS: Record<DebugKind, { key: string; contentType: string }> = {
  screenshot: { key: "frame-debug/screenshot.png", contentType: "image/png" },
  logs: { key: "frame-debug/logs.txt", contentType: "text/plain; charset=utf-8" },
};
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const CHECKIN_KEY = "frame:checkin";
const COMMAND_KEY = "frame:command";
const DEBUG_KEY = "frame:debug";
const MAX_ERROR = 1000;

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isNumOrNull = (x: unknown) => x === null || isNum(x);

export function parseCheckin(body: unknown): Checkin | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!isNum(b.versionCode) || !isNum(b.uptimeS) || !isNum(b.freeMemMb)) return null;
  if (!isNumOrNull(b.lastFeedOkAt) || !isNumOrNull(b.wifiRssi)) return null;
  if (typeof b.tailscaleUp !== "boolean") return null;
  if (!(b.lastError === null || typeof b.lastError === "string")) return null;
  return {
    versionCode: b.versionCode,
    uptimeS: b.uptimeS,
    lastFeedOkAt: b.lastFeedOkAt as number | null,
    freeMemMb: b.freeMemMb,
    wifiRssi: b.wifiRssi as number | null,
    tailscaleUp: b.tailscaleUp,
    lastError: b.lastError === null ? null : (b.lastError as string).slice(0, MAX_ERROR),
  };
}

// ---- storage: KV when bound, else memory ----
const memory = new Map<string, unknown>();

async function read<T>(key: string): Promise<T | null> {
  const kv = bindings().FRAME;
  if (kv) return ((await kv.get(key, "json")) as T | null) ?? null;
  return (memory.get(key) as T | undefined) ?? null;
}
async function write(key: string, value: unknown): Promise<void> {
  const kv = bindings().FRAME;
  if (kv) return kv.put(key, JSON.stringify(value));
  memory.set(key, value);
}
async function remove(key: string): Promise<void> {
  const kv = bindings().FRAME;
  if (kv) return kv.delete(key);
  memory.delete(key);
}

// One frame per household for now. The original household's (ludlow) records keep their
// original keys; every other household's are prefixed "h:<id>:".
const LEGACY = "ludlow";
const k = (key: string, h: string) => (h === LEGACY ? key : `h:${h}:${key}`);
/** Where a household's screenshot/logs live in R2. */
export const debugKey = (kind: DebugKind, h: string = LEGACY) => (h === LEGACY ? DEBUG_KEYS[kind].key : `h/${h}/${DEBUG_KEYS[kind].key}`);

export async function recordCheckin(c: Checkin, at: number, h: string = LEGACY): Promise<void> {
  await write(k(CHECKIN_KEY, h), { ...c, at } satisfies StoredCheckin);
}
export const latestCheckin = (h: string = LEGACY) => read<StoredCheckin>(k(CHECKIN_KEY, h));

export async function queueCommand(c: FrameCommand, h: string = LEGACY): Promise<void> {
  await write(k(COMMAND_KEY, h), c);
}
export async function peekCommand(h: string = LEGACY): Promise<FrameCommand | null> {
  const c = await read<unknown>(k(COMMAND_KEY, h));
  return isCommand(c) ? c : null;
}
export async function takeCommand(h: string = LEGACY): Promise<FrameCommand | null> {
  const c = await peekCommand(h);
  if (c) await remove(k(COMMAND_KEY, h));
  return c;
}

export async function noteDebugUpload(kind: DebugKind, at: number, h: string = LEGACY): Promise<void> {
  const meta = await debugMeta(h);
  await write(k(DEBUG_KEY, h), { ...meta, [kind === "screenshot" ? "screenshotAt" : "logsAt"]: at });
}
export async function debugMeta(h: string = LEGACY): Promise<DebugMeta> {
  return (await read<DebugMeta>(k(DEBUG_KEY, h))) ?? { screenshotAt: null, logsAt: null };
}

export async function __resetOpsForTest(): Promise<void> {
  memory.clear();
}
