"use client";
import Link from "next/link";
import { useWeather } from "@/lib/hooks/useWeather";
import { HOME } from "@/lib/config";
import { rateRideDays, bestRideDay } from "@/lib/cycle/rideability";
import { describeWeather } from "@/lib/weather/codes";
import { CYCLING } from "@/lib/content/cycling";
import { Section } from "@/components/Section";

const VERDICT_COLOR: Record<string, string> = {
  great: "text-sage",
  good: "text-sage",
  ok: "text-muted",
  poor: "text-muted",
};

function suggestedRide(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const current = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const doy = Math.floor((current - start) / 86_400_000);
  return CYCLING[doy % CYCLING.length];
}

export default function RidePage() {
  const { data, isLoading } = useWeather(HOME);

  if (isLoading || !data) {
    return (
      <main className="mx-auto max-w-3xl px-6 pb-24">
        <div className="pt-8 pb-4">
          <Link href="/" className="section-label hover:underline">← home</Link>
        </div>
        <h1 className="text-3xl mb-4">plan your cycle ride</h1>
        <p className="text-muted text-sm">checking the forecast…</p>
      </main>
    );
  }

  const ranked = rateRideDays(data.daily);
  const best = bestRideDay(data.daily);
  const ride = best ? suggestedRide(best.date) : CYCLING[0];

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24">
      <div className="pt-8 pb-4">
        <Link href="/" className="section-label hover:underline">← home</Link>
      </div>

      <h1 className="text-3xl mb-2">plan your cycle ride</h1>
      <p className="text-muted text-sm mb-8">
        the next seven days, ranked for off-road riding around ludlow.
      </p>

      <Section label="7-day ride ranking">
        <div className="divide-y divide-divider rounded-2xl border border-divider bg-card overflow-hidden">
          {ranked.map((day) => {
            const condition = describeWeather(
              data.daily.find((d) => d.date === day.date)?.weatherCode ?? 0
            ).label;
            const isBest = day.date === best?.date;
            return (
              <div
                key={day.date}
                className={`flex items-center gap-4 px-5 py-3 ${isBest ? "bg-paper" : ""}`}
              >
                <span className="w-8 text-sm font-medium text-ink">{day.weekday}</span>
                <span className={`text-xs font-medium uppercase tracking-wide ${VERDICT_COLOR[day.verdict]}`}>
                  {day.verdict}
                </span>
                <span className="text-sm text-ink ml-auto">{day.tempMax}°</span>
                <span className="text-sm text-muted">{day.precip}mm</span>
                <span className="text-sm text-muted hidden sm:inline">{condition}</span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section label="suggested ride">
        <div className="rounded-2xl border border-divider bg-card p-5">
          <h2 className="text-xl">{ride.name}</h2>
          <p className="text-sm text-muted mt-1">{ride.note}</p>
          {ride.distance && (
            <p className="text-xs text-muted mt-2">{ride.distance}</p>
          )}
          <Link
            href="/map"
            className="section-label mt-4 inline-block text-sage hover:underline"
          >
            open the route planner ↗
          </Link>
        </div>
      </Section>
    </main>
  );
}
