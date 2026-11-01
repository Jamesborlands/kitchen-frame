import Link from "next/link";
import { TodayWeather } from "@/components/TodayWeather";
import { Forecast7Day } from "@/components/Forecast7Day";
import { HourlyStrip } from "@/components/HourlyStrip";
import { RadarMap } from "@/components/RadarMap";
import { WarningBanner } from "@/components/WarningBanner";
import { Section } from "@/components/Section";

export const metadata = {
  title: "Weather — Cottage View",
  description: "Ludlow weather: now, the rain radar, and the days ahead.",
};

export default function WeatherPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-20">
      <WarningBanner className="mt-4" />

      <header className="pt-8 pb-2">
        <h1 className="text-4xl">weather</h1>
        <p className="text-muted">ludlow — now, the radar, and the days ahead.</p>
      </header>

      <div className="space-y-6">
        <TodayWeather />

        <Section label="rain radar">
          <RadarMap />
        </Section>

        <Section label="the next hours">
          <HourlyStrip />
        </Section>

        <Forecast7Day />

        <Link href="/" className="section-label inline-block pt-2">
          ← back home
        </Link>
      </div>
    </main>
  );
}
