import { describe, it, expect } from "vitest";
import { parseRelease, apkKey } from "@/lib/kitchen/release";

const ok = { versionCode: 4, versionName: "1.0.4", sha256: "a".repeat(64), sizeBytes: 1500000, minVersionCode: 1 };

describe("parseRelease", () => {
  it("accepts a valid release", () => {
    expect(parseRelease(ok)).toEqual(ok);
  });
  it("rejects bad hashes, non-integer versions and junk", () => {
    expect(parseRelease({ ...ok, sha256: "A".repeat(64) })).toBeNull();
    expect(parseRelease({ ...ok, sha256: "a".repeat(63) })).toBeNull();
    expect(parseRelease({ ...ok, versionCode: 4.5 })).toBeNull();
    expect(parseRelease({ ...ok, minVersionCode: -1 })).toBeNull();
    expect(parseRelease(null)).toBeNull();
  });
  it("names the APK by version", () => {
    expect(apkKey(4)).toBe("frame-app/4.apk");
  });
});
