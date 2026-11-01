// Slows PIN guessing on /unlock: after MAX_FAILURES wrong PINs from one address
// within WINDOW_MS, every attempt from it is refused until the window passes.
// Kept in KV when bound (eventually consistent — fine for a brake), else memory.
import { bindings } from "@/lib/cloudflare/bindings";

export const MAX_FAILURES = 10;
export const WINDOW_MS = 15 * 60_000;

interface Entry { count: number; since: number }
const memory = new Map<string, Entry>();
export function __resetThrottleForTest(): void { memory.clear(); }

const key = (ip: string) => `throttle:unlock:${ip}`;

async function read(ip: string): Promise<Entry | null> {
  const kv = bindings().FRAME;
  const e = kv ? ((await kv.get(key(ip), "json")) as Entry | null) : memory.get(ip) ?? null;
  return e && Date.now() - e.since < WINDOW_MS ? e : null;
}

export async function blocked(ip: string): Promise<boolean> {
  return ((await read(ip))?.count ?? 0) >= MAX_FAILURES;
}

export async function failed(ip: string): Promise<void> {
  const e = (await read(ip)) ?? { count: 0, since: Date.now() };
  const next = { count: e.count + 1, since: e.since };
  const kv = bindings().FRAME;
  if (kv) await kv.put(key(ip), JSON.stringify(next), { expirationTtl: Math.ceil(WINDOW_MS / 1000) + 60 });
  else memory.set(ip, next);
}

export const clientIp = (req: Request) => req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
