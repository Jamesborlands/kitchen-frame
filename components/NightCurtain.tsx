"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useNow } from "@/lib/hooks/useNow";
import { useWeather } from "@/lib/hooks/useWeather";
import { HOME } from "@/lib/config";
import { isNight } from "@/lib/kitchen/schedule";
import { readClock } from "@/lib/time/clocks";
import { describeWeather } from "@/lib/weather/codes";

const WAKE_MS = 5 * 60_000;
const noopSubscribe = () => () => {};

// Overnight the kitchen goes dark: a dim clock and the temperature on near-black,
// so the screen isn't lighting up the room. A tap brings the dashboard back for
// five minutes. Everything underneath keeps polling, so morning is up to date.
export function NightCurtain() {
  const now = useNow();
  const { data } = useWeather(HOME);
  const [wokenAt, setWokenAt] = useState<number | null>(null);
  // /kitchen is prerendered at build time, so only decide day vs night in the browser.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (wokenAt === null) return;
    const id = setTimeout(() => setWokenAt(null), WAKE_MS);
    return () => clearTimeout(id);
  }, [wokenAt]);

  if (!hydrated || !isNight(now) || wokenAt !== null) return null;

  const clock = readClock(HOME.timezone, now);
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: HOME.timezone, weekday: "long", day: "numeric", month: "long",
  }).format(now).toLowerCase();

  return (
    <button
      type="button"
      aria-label="night mode — tap to show the dashboard"
      onClick={() => setWokenAt(Date.now())}
      className="fixed inset-0 z-50 flex cursor-default flex-col items-center justify-center bg-[#0E0D0B] text-paper/35 transition-opacity duration-1000"
    >
      <p className="font-[family-name:var(--font-cormorant)] text-[9rem] leading-none">
        {clock.time}
        <span className="ml-2 text-5xl">{clock.suffix}</span>
      </p>
      <p className="mt-4 text-lg">{date}</p>
      {data && (
        <p className="mt-1 text-lg">
          {Math.round(data.current.temperature)}° · {describeWeather(data.current.weatherCode).label}
        </p>
      )}
    </button>
  );
}
