// The current kitchen-frame app build, as published by
// scripts/release-frame-app.mjs into the private R2 bucket. The frame checks
// this daily and on the `update` command.
import { bindings } from "@/lib/cloudflare/bindings";

export interface FrameRelease {
  versionCode: number;
  versionName: string;
  sha256: string;
  sizeBytes: number;
  minVersionCode: number;
}

export const RELEASE_JSON_KEY = "frame-app/release.json";
export const apkKey = (versionCode: number) => `frame-app/${versionCode}.apk`;

const posInt = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;

export function parseRelease(x: unknown): FrameRelease | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!posInt(r.versionCode) || !posInt(r.sizeBytes) || !posInt(r.minVersionCode)) return null;
  if (typeof r.versionName !== "string") return null;
  if (typeof r.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(r.sha256)) return null;
  return {
    versionCode: r.versionCode,
    versionName: r.versionName,
    sha256: r.sha256,
    sizeBytes: r.sizeBytes,
    minVersionCode: r.minVersionCode,
  };
}

export async function getRelease(): Promise<FrameRelease | null> {
  const obj = await bindings().PHOTOS?.get(RELEASE_JSON_KEY);
  if (!obj) return null;
  try {
    return parseRelease(await new Response(obj.body).json());
  } catch {
    return null;
  }
}
