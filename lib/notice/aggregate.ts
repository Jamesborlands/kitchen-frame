import { type NoticeCard, type NoticeContext, type NoticeSource } from "@/lib/notice/card";
import { earthquakesSource } from "@/lib/notice/sources/earthquakes";
import { notableWeatherSource } from "@/lib/notice/sources/notableWeather";
import { weatherAdviceSource } from "@/lib/notice/sources/weatherAdvice";
import { airQualitySource } from "@/lib/notice/sources/airQuality";
import { auroraSource } from "@/lib/notice/sources/aurora";
import { bbcTopSource, localNewsSource } from "@/lib/notice/sources/news";
import { familySource } from "@/lib/notice/sources/family";
import { calendarSource } from "@/lib/notice/sources/calendar";
import { skySource } from "@/lib/notice/sources/sky";
import { delightSource } from "@/lib/notice/sources/delight";

const DEFAULT_SOURCES: NoticeSource[] = [
  earthquakesSource,
  notableWeatherSource,
  weatherAdviceSource,
  airQualitySource,
  auroraSource,
  calendarSource,
  familySource,
  skySource,
  localNewsSource,
  bbcTopSource,
  delightSource,
];

const MAX_CARDS = 6;

const FALLBACK_CARD: NoticeCard = {
  id: "notice-fallback",
  kind: "delight",
  label: "a thought",
  title: "a quiet day at home — nothing to report, which is its own kind of good.",
  priority: 0,
};

export async function aggregateNotices(
  ctx: NoticeContext,
  fetchImpl: typeof fetch = fetch,
  sources: NoticeSource[] = DEFAULT_SOURCES,
): Promise<NoticeCard[]> {
  const results = await Promise.all(
    sources.map(async (s) => {
      try {
        return await s(ctx, fetchImpl);
      } catch {
        return [];
      }
    }),
  );
  const cards = results
    .flat()
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_CARDS);
  return cards.length > 0 ? cards : [FALLBACK_CARD];
}
