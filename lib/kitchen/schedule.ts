import { KITCHEN } from "@/lib/config";
import { wallClockMinutes } from "@/lib/time/clocks";

// Every kitchen widget polls its own data, so the page itself only needs a full
// reload for a new deploy or the once-a-night refresh. Both are decided here so
// the timing is testable.

const MIN_UPTIME_MS = 2 * 60 * 60_000; // never reload twice in one reload hour

export function londonHour(at: Date): number {
  return Math.floor(wallClockMinutes("Europe/London", at) / 60);
}

export function isNight(at: Date, schedule: { nightStartHour: number; nightEndHour: number } = KITCHEN): boolean {
  const h = londonHour(at);
  const { nightStartHour: start, nightEndHour: end } = schedule;
  return start > end ? h >= start || h < end : h >= start && h < end;
}

export interface ReloadCheck {
  now: Date;
  loadedAt: Date;
  builtVersion: string | null;
  liveVersion: string | null;
}

export function shouldReload({ now, loadedAt, builtVersion, liveVersion }: ReloadCheck): boolean {
  if (builtVersion && liveVersion && builtVersion !== liveVersion) return true;
  return (
    londonHour(now) === KITCHEN.dailyReloadHour &&
    now.getTime() - loadedAt.getTime() >= MIN_UPTIME_MS
  );
}
