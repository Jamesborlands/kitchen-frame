// Pure builders for the kitchen frame feed. Each one turns data the site
// already fetches into the plain, ready-to-draw JSON the native frame app
// renders — the app holds no weather/clock/pagination logic of its own.
import type { WeatherData } from "@/lib/sources/weather";
import { warningEndDay, type Warning } from "@/lib/sources/warnings";
import type { NoticeCard } from "@/lib/notice/card";
import type { Frame, FrameNote } from "@/lib/frame/store";
import { LOVE_WINDOW_MS } from "@/lib/frame/love";
import type { Place } from "@/lib/family/settings";

/** What the builders need of a place (config GeoLocations and household Places both fit). */
export type Loc = Pick<Place, "key" | "label" | "sublabel" | "latitude" | "longitude" | "timezone" | "watercolor">;
import { describeWeather, lightPhase, skyKey } from "@/lib/weather/codes";
import { seasonalSkyKey } from "@/lib/weather/seasonalSky";
import { londonHourKey, todayOutlook } from "@/lib/weather/today";
import { wallClockMinutes } from "@/lib/time/clocks";
import { seasonalScene } from "@/lib/time/season";
import { moonPhase } from "@/lib/time/moon";
import { paginate } from "@/lib/frame/boardText";
import { initials, initialsAmong } from "@/lib/initials";
import { NOTICE_KIND_COLORS, DEFAULT_NOTICE_COLOR } from "@/lib/notice/kinds";
import type {
  FeedBoard, FeedClock, FeedNotice, FeedPhoto, FeedWarning, FeedWeather,
} from "@/lib/kitchen/feed/types";

// The kitchen's board is the small 2×18 one under the photo (PhotoFrame fill mode).
export const KITCHEN_BOARD = { rows: 2, cols: 18, maxNotes: 5, rotateMs: 30_000 } as const;
export const PHOTO_SLIDE_MS = 20_000;
export const NOTICE_ROTATE_MS = 9_000;

const sceneUrl = (key: string) => `/watercolor/${key}.webp`;
const hhmm = (iso: string) => iso.slice(11, 16);
const minutesOf = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));

export function weatherSection(data: WeatherData, fetchedAt: number, now: Date, latitude = 52.37): FeedWeather {
  const { current } = data;
  const today = data.daily[0];
  const desc = describeWeather(current.weatherCode);
  const phase = lightPhase(wallClockMinutes("Europe/London", now), minutesOf(today.sunrise), minutesOf(today.sunset));
  const outlook = todayOutlook(today, data.hourly, londonHourKey(now));
  const moon = moonPhase(now);
  return {
    sceneUrl: sceneUrl(seasonalSkyKey(skyKey(current.weatherCode, phase), now, latitude)),
    tempC: Math.round(current.temperature),
    summary: `${desc.label} · feels ${Math.round(current.apparentTemperature)}°`,
    todayLine: `high ${outlook.high}° · low ${outlook.low}°${outlook.rain ? ` · ${outlook.rain}` : ""}`,
    uv: `uv ${Math.round(current.uvIndex)}`,
    sun: `↑ ${hhmm(today.sunrise)} · ↓ ${hhmm(today.sunset)}`,
    moon: `moon — ${moon.name} · ${Math.round(moon.illumination * 100)}% lit`,
    fetchedAt,
  };
}

export function clockSection(loc: Loc, data: WeatherData | null, now: Date): FeedClock {
  // a place with no painting of its own shows its weather's sky
  const scene = loc.watercolor
    ? seasonalScene(loc.watercolor, now, loc.latitude)
    : seasonalSkyKey(data ? skyKey(data.current.weatherCode) : "cloud", now, loc.latitude);
  return {
    key: loc.key,
    label: loc.label,
    sublabel: loc.sublabel,
    timeZone: loc.timezone,
    sceneUrl: sceneUrl(scene),
    tempC: data ? Math.round(data.current.temperature) : null,
    condition: data ? describeWeather(data.current.weatherCode).label : null,
  };
}

// Same muted tones as components/WarningBanner.tsx.
const WARNING_TONE = {
  red: { bg: "#F1DAD6", fg: "#7E3A33", dot: "#B0504A" },
  amber: { bg: "#F2E5CF", fg: "#7E5622", dot: "#C0833A" },
  yellow: { bg: "#EFE8CE", fg: "#6E6230", dot: "#B6A03C" },
} as const;

export function warningSection(warnings: Warning[]): FeedWarning | null {
  const top = warnings[0];
  if (!top) return null;
  const until = warningEndDay(top.period);
  return {
    level: top.level,
    title: `${top.level} weather warning`,
    detail: `${top.type}${until ? ` until ${until}` : ""}`,
    ...WARNING_TONE[top.level],
  };
}

export function noticesSection(cards: NoticeCard[]): FeedNotice[] {
  return cards.map((c) => ({
    id: c.id,
    kind: c.kind,
    eyebrow: c.label,
    headline: c.title,
    detail: c.detail ?? null,
    color: c.color ?? NOTICE_KIND_COLORS[c.kind] ?? DEFAULT_NOTICE_COLOR,
  }));
}

/** How many photos ride along in the feed itself; the frame fetches the full list when photosVersion changes. */
export const FEED_PHOTOS = 40;

/** A short fingerprint of the photo list, so the frame only downloads it when it changed. */
export async function photosVersion(photos: FeedPhoto[]): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(photos)));
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function photosSection(frame: Frame, loveOn = false): FeedPhoto[] {
  const ini = initialsAmong([...frame.photos.map((p) => p.from), ...frame.notes.map((n) => n.from)]);
  return frame.photos.map((p) => ({
    id: p.id, url: p.url, from: p.from, initials: p.from.trim() ? ini(p.from) : "", at: p.at, // unknown sender: no badge
    lovableUntil: loveOn && p.waFrom && p.waMessageId ? p.at + LOVE_WINDOW_MS : null,
    loved: Boolean(p.lovedAt),
  }));
}

/** `otherNames`: everyone else on the frame (photo senders), so initials match theirs. */
export function boardSection(notes: FrameNote[], otherNames: string[] = []): FeedBoard | null {
  const ini = initialsAmong([...otherNames, ...notes.map((n) => n.from)]);
  const recent = notes.slice(0, KITCHEN_BOARD.maxNotes);
  if (recent.length === 0) return null;
  return {
    rows: KITCHEN_BOARD.rows,
    cols: KITCHEN_BOARD.cols,
    rotateMs: KITCHEN_BOARD.rotateMs,
    pages: recent.flatMap((n) =>
      paginate(n.text, KITCHEN_BOARD.cols, KITCHEN_BOARD.rows).map((page) => ({
        lines: page.split("\n"),
        from: n.from,
        initials: ini(n.from),
      })),
    ),
  };
}
