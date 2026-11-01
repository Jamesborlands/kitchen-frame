import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readProps, planRelease } from "../frameRelease.mjs";
import { parseRelease } from "@/lib/kitchen/release";

const PROPS = "# comment\nversionCode=3\nversionName=1.2.0\nminVersionCode=1\n";
const apk = new TextEncoder().encode("pretend apk bytes");

describe("readProps", () => {
  it("reads version.properties", () => {
    expect(readProps(PROPS)).toEqual({ versionCode: 3, versionName: "1.2.0", minVersionCode: 1 });
  });
});

describe("planRelease", () => {
  it("describes the APK exactly as the server reads it", () => {
    const r = planRelease(readProps(PROPS), apk, { versionCode: 2 });
    expect(r).toEqual({
      versionCode: 3, versionName: "1.2.0", minVersionCode: 1,
      sha256: createHash("sha256").update(apk).digest("hex"), sizeBytes: apk.byteLength,
    });
    expect(parseRelease(r)).toEqual(r);
  });

  it("first release ever", () => {
    expect(planRelease(readProps(PROPS), apk, null).versionCode).toBe(3);
  });

  it("refuses to go backwards or repeat a version (the frame would never install it)", () => {
    expect(() => planRelease(readProps(PROPS), apk, { versionCode: 3 })).toThrow(/bump versionCode/);
    expect(() => planRelease(readProps(PROPS), apk, { versionCode: 9 })).toThrow(/bump versionCode/);
  });

  it("refuses a minimum above the version itself", () => {
    expect(() => planRelease(readProps("versionCode=3\nversionName=x\nminVersionCode=4\n"), apk, null)).toThrow(/minVersionCode/);
  });
});
