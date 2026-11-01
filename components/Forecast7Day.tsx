"use client";
import { Section } from "@/components/Section";
import { WeatherIcon } from "@/components/WeatherIcon";
import { useWeather } from "@/lib/hooks/useWeather";
import { HOME } from "@/lib/config";
import { describeWeather } from "@/lib/weather/codes";

function weekday(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/London" })
    .format(new Date(`${date}T12:00:00`));
}

export function Forecast7Day() {
  const { data, error } = useWeather(HOME);
  if (!data) {
    return <Section label="the week ahead"><p className="text-muted">{error ? "couldn't load the forecast." : "loading…"}</p></Section>;
  }
  return (
    <Section label="the week ahead">
      <ul className="grid grid-cols-4 sm:grid-cols-7 gap-y-4 divide-divider sm:divide-x">
        {data.daily.map((d) => {
          const sky = describeWeather(d.weatherCode);
          return (
            <li key={d.date} className="flex flex-col items-center gap-1 px-2 text-center">
              <span className="section-label">{weekday(d.date)}</span>
              <WeatherIcon sky={sky.watercolor} className="text-sage text-lg" title={sky.label} />
              <span className="tabular-nums text-sm">
                {Math.round(d.tempMax)}° <span className="text-muted">{Math.round(d.tempMin)}°</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
