// Pure helpers for scripts/release-frame-app.mjs (tested in __tests__).
import { createHash } from "node:crypto";

/** android/version.properties → { versionCode, versionName, minVersionCode } */
export function readProps(text) {
  const get = (k) => text.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim();
  return { versionCode: Number(get("versionCode")), versionName: get("versionName") ?? "", minVersionCode: Number(get("minVersionCode") ?? 1) };
}

/** release.json for this APK. `current` is the published release (or null for the first). */
export function planRelease(props, apkBytes, current) {
  const { versionCode, versionName, minVersionCode } = props;
  if (!Number.isInteger(versionCode) || versionCode < 1) throw new Error("versionCode missing from version.properties");
  if (current && versionCode <= current.versionCode) {
    throw new Error(`bump versionCode in android/version.properties: ${versionCode} is not newer than the published ${current.versionCode}`);
  }
  if (!Number.isInteger(minVersionCode) || minVersionCode > versionCode) throw new Error("minVersionCode must be ≤ versionCode");
  return {
    versionCode, versionName, minVersionCode,
    sha256: createHash("sha256").update(apkBytes).digest("hex"),
    sizeBytes: apkBytes.byteLength,
  };
}
