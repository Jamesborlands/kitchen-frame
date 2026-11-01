#!/usr/bin/env node
// Publish a new kitchen-frame app version. Frames pick it up within a day (or
// at once with the `update` command on /kitchen/status) and roll back by
// themselves if it keeps crashing.
//
//   1. bump versionCode (and versionName) in android/version.properties
//   2. node scripts/release-frame-app.mjs            (--dry-run to stop before uploading)
//
// Signs with the release keystore at ~/.cottage-view/kitchen-release.keystore,
// whose password is in the macOS Keychain (service cottage-view-frame-keystore).
// Frames only accept updates signed with that same key — back both up.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { planRelease, readProps } from "./lib/frameRelease.mjs";

const dryRun = process.argv.includes("--dry-run");
const BUCKET = "cottage-view-photos";
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });

const props = readProps(readFileSync("android/version.properties", "utf8"));
const keystore = join(homedir(), ".cottage-view", "kitchen-release.keystore");
const pass = run("security", ["find-generic-password", "-s", "cottage-view-frame-keystore", "-w"]).trim();

console.log(`building release ${props.versionCode} (${props.versionName}) …`);
run("./build.sh", ["release"], { cwd: "android", env: { ...process.env, FRAME_KEYSTORE: keystore, FRAME_KEYSTORE_PASS: pass } });
const apk = readFileSync("android/build/kitchen-release.apk");

let current = null;
try {
  current = JSON.parse(run("npx", ["wrangler", "r2", "object", "get", `${BUCKET}/frame-app/release.json`, "--remote", "--pipe"]));
} catch {
  console.log("no release published yet");
}
const release = planRelease(props, apk, current);
console.log(`release: ${JSON.stringify(release)}`);
if (dryRun) process.exit(0);

const dir = mkdtempSync(join(tmpdir(), "frame-release-"));
writeFileSync(join(dir, "release.json"), JSON.stringify(release));
// the APK first: a frame must never see a release.json whose APK isn't there yet
run("npx", ["wrangler", "r2", "object", "put", `${BUCKET}/frame-app/${release.versionCode}.apk`, "--file", "android/build/kitchen-release.apk",
  "--content-type", "application/vnd.android.package-archive", "--remote"]);
run("npx", ["wrangler", "r2", "object", "put", `${BUCKET}/frame-app/release.json`, "--file", join(dir, "release.json"),
  "--content-type", "application/json", "--remote"]);
console.log(`published ${release.versionCode}. Frames update within a day, or now via /kitchen/status → update.`);
