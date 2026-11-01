// The JSON contract between /api/kitchen/feed and the native kitchen frame app
// (android/). Additive changes only — the app rejects an unknown feedVersion.
export const FEED_VERSION = 1;

export interface FeedWeather {
  sceneUrl: string;      // "/watercolor/rain.webp" — public, no auth needed
  tempC: number;         // rounded
  summary: string;       // "light rain · feels 12°"
  todayLine: string;     // "high 15° · low 8° · rain likely from 3pm"
  uv: string;            // "uv 3"
  sun: string;           // "↑ 06:12 · ↓ 18:40"
  moon: string;          // "moon — waxing gibbous · 80% lit"
  fetchedAt: number;     // ms; the app derives "updated Xh ago" from this
}
export interface FeedWarning { level: "yellow" | "amber" | "red"; title: string; detail: string; bg: string; fg: string; dot: string }
export interface FeedClock {
  key: string; label: string; sublabel: string; timeZone: string;
  sceneUrl: string; tempC: number | null; condition: string | null;
}
export interface FeedNotice { id: string; kind: string; eyebrow: string; headline: string; detail: string | null; color: string }
export interface FeedPhoto {
  id: string; url: string; from: string; initials: string; at: number;
  lovableUntil: number | null; // a ❤️ can go back on WhatsApp until then (null: never)
  loved: boolean;
}
export interface FeedBoardPage { lines: string[]; from: string; initials: string }
export interface FeedBoard { rows: number; cols: number; rotateMs: number; pages: FeedBoardPage[] }
export interface KitchenFeed {
  feedVersion: typeof FEED_VERSION;
  generatedAt: number;
  serverVersion: string | null;
  weather: FeedWeather | null;
  warning: FeedWarning | null;
  clocks: FeedClock[];
  clockSleep: { startHour: number; endHour: number };
  notices: FeedNotice[];
  noticeRotateMs: number;
  photos: FeedPhoto[]; // the newest FEED_PHOTOS only (what app versions before the photo list read)
  photosVersion: string; // changes whenever the full list (GET /api/kitchen/photos) does
  photoSlideMs: number;
  board: FeedBoard | null;
  night: { startHour: number; endHour: number; timeZone: string };
  app: { latestVersionCode: number | null; minVersionCode: number | null };
  /** "Happening today" (reminders, calendar, birthdays); null when it couldn't be built. */
  today: import("@/lib/kitchen/feed/today").FeedToday | null;
  todos: { id: string; text: string; done: boolean }[];
  /** Gentle notice cards for the Today card's rotating line (news only if switched on). */
  tips: FeedNotice[];
  /** Which parts of the screen this household has on. */
  modules: import("@/lib/family/settings").Modules;
  photoFit: "smart" | "whole" | "fill";
}
