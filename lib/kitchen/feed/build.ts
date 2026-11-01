// Assembles the kitchen frame feed. Every section is built in isolation and
// fails soft — a broken source (or a builder tripping on odd data) costs only
// its own section, never the feed. "The kitchen never blanks."
import type { WeatherData } from "@/lib/sources/weather";
import type { Warning } from "@/lib/sources/warnings";
import type { NoticeCard } from "@/lib/notice/card";
import type { Frame } from "@/lib/frame/store";

import { ASLEEP_HOURS } from "@/lib/time/clocks";
import type { LastGood } from "@/lib/kitchen/feed/lastGood";
import { FEED_VERSION, type KitchenFeed } from "@/lib/kitchen/feed/types";
import { defaultSettings, type FamilySettings } from "@/lib/family/settings";
import type { FeedToday } from "@/lib/kitchen/feed/today";
import type { Todo } from "@/lib/family/todos";
import {
  boardSection, clockSection, noticesSection, photosSection, warningSection, weatherSection,
  NOTICE_ROTATE_MS, FEED_PHOTOS, photosVersion, type Loc,
} from "@/lib/kitchen/feed/sections";

export interface FeedDeps {
  weather(loc: Loc, now: number): Promise<LastGood<WeatherData> | null>;
  warnings(): Promise<Warning[]>;
  notices(now: Date, settings: FamilySettings): Promise<NoticeCard[]>;
  frame(now: number): Promise<Frame>;
  release(): Promise<{ versionCode: number; minVersionCode: number } | null>;
  serverVersion: string | null;
  /** What the household sets on /family; defaults when absent or unreadable. */
  settings?(): Promise<FamilySettings>;
  /** WhatsApp sending is configured, so photos can get a ❤️ back. */
  loveOn?: boolean;
  today?(now: Date, settings: FamilySettings): Promise<FeedToday | null>;
  todos?(): Promise<Todo[]>;
}

async function soft<T>(fallback: T, f: () => Promise<T> | T): Promise<T> {
  try {
    return await f();
  } catch {
    return fallback;
  }
}

export async function buildFeed(deps: FeedDeps, now: Date): Promise<KitchenFeed> {
  const t = now.getTime();
  const settings = await soft(defaultSettings(), () => (deps.settings ? deps.settings() : defaultSettings()));
  // home and the family clocks, each fetched once (home is usually one of them)
  const locs: Loc[] = [settings.home, ...settings.places].filter((l, i, all) => all.findIndex((x) => x.key === l.key) === i);
  const [weathers, warnings, allNotices, frame, release, today, todos] = await Promise.all([
    Promise.all(locs.map((loc) => soft(null, () => deps.weather(loc, t)))),
    soft<Warning[]>([], () => deps.warnings()),
    soft<NoticeCard[]>([], () => deps.notices(now, settings)),
    soft<Frame>({ photos: [], notes: [] }, () => deps.frame(t)),
    soft(null, () => deps.release()),
    soft<FeedToday | null>(null, () => (deps.today ? deps.today(now, settings) : null)),
    soft<Todo[]>([], () => (deps.todos ? deps.todos() : [])),
  ]);
  // a quiet day's full card shows everything, news too; the
  // one-line tip on a busy day leaves headlines out unless they're switched on
  const noticeSection = await soft([], () => noticesSection(allNotices));
  const tipSection = await soft([], () => noticesSection(settings.showNews ? allNotices : allNotices.filter((n) => n.kind !== "news")));

  const allPhotos = await soft([], () => photosSection(frame, deps.loveOn));
  const weatherAt = (l: Loc) => weathers[locs.findIndex((x) => x.key === l.key)] ?? null;
  const home = weatherAt(settings.home);

  return {
    feedVersion: FEED_VERSION,
    generatedAt: t,
    serverVersion: deps.serverVersion,
    weather: await soft(null, () => (home ? weatherSection(home.value, home.fetchedAt, now, settings.home.latitude) : null)),
    warning: await soft(null, () => warningSection(warnings)),
    clocks: settings.places.map((loc) => clockSection(loc, weatherAt(loc)?.value ?? null, now)),
    clockSleep: { startHour: ASLEEP_HOURS.startHour, endHour: ASLEEP_HOURS.endHour },
    notices: noticeSection,
    noticeRotateMs: NOTICE_ROTATE_MS,
    photos: allPhotos.slice(0, FEED_PHOTOS),
    photosVersion: await photosVersion(allPhotos),
    photoSlideMs: settings.photoSlideSec * 1000,
    board: await soft(null, () => boardSection(frame.notes, frame.photos.map((p) => p.from))),
    night: { startHour: settings.nightStartHour, endHour: settings.nightEndHour, timeZone: settings.home.timezone },
    app: {
      latestVersionCode: release?.versionCode ?? null,
      minVersionCode: release?.minVersionCode ?? null,
    },
    photoFit: settings.photoFit,
    today,
    todos: todos.map((t) => ({ id: t.id, text: t.text, done: t.done })),
    tips: tipSection,
    modules: settings.modules,
  };
}
