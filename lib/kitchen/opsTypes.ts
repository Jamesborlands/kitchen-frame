// Plain types and the command list for the frame's check-in/commands — no
// server imports, so the /kitchen/status client page can use them too.
// openadb: lift the frame's adb lock-down for 30 minutes (someone on its Wi-Fi, or Tailscale, needs a shell)
/** Panels the frame can be asked to open, screenshot and close again — testing from afar. */
export const SHOW_PANELS = ["weather", "calendar", "todo", "rides", "messages", "settings", "wifi"] as const;
export const COMMANDS = [
  "reload", "update", "screenshot", "logs", "restart", "openadb",
  ...SHOW_PANELS.map((p) => `show-${p}` as const),
] as const;
export type FrameCommand = (typeof COMMANDS)[number];

export interface Checkin {
  versionCode: number;
  uptimeS: number;
  lastFeedOkAt: number | null;
  freeMemMb: number;
  wifiRssi: number | null;
  tailscaleUp: boolean;
  lastError: string | null;
}
export interface StoredCheckin extends Checkin { at: number }

export type DebugKind = "screenshot" | "logs";
export interface DebugMeta { screenshotAt: number | null; logsAt: number | null }

export function isCommand(x: unknown): x is FrameCommand {
  return typeof x === "string" && (COMMANDS as readonly string[]).includes(x);
}
