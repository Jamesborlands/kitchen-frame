import { getCloudflareContext } from "@opennextjs/cloudflare";

// The Cloudflare resources this app uses, as declared in wrangler.jsonc. Typed
// as the small slice we call, so tests can pass plain fakes.
//   PHOTOS  — R2 bucket holding WhatsApp photos (private; served via /api/photo)
//   FRAME   — Workers KV namespace holding the photo/note records

export interface R2ObjectLike {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

export interface R2Like {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete?(key: string): Promise<unknown>;
}

export interface KVLike {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AppBindings {
  PHOTOS?: R2Like;
  FRAME?: KVLike;
  DB?: import("@/lib/db/d1").D1Like;
}

let override: AppBindings | null = null;

/** Test hook: pretend these bindings exist (null to go back to the real ones). */
export function __setBindingsForTest(b: AppBindings | null): void {
  override = b;
}

// Outside Cloudflare (vitest, a plain `next start`) there's no context, and the
// callers fall back to their in-memory / not-configured behaviour.
export function bindings(): AppBindings {
  if (override) return override;
  try {
    return getCloudflareContext().env as unknown as AppBindings;
  } catch {
    return {};
  }
}
