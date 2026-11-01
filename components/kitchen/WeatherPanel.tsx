"use client";
import { HourlyStrip } from "@/components/HourlyStrip";
import { Forecast7Day } from "@/components/Forecast7Day";

export function WeatherPanel() {
  return (
    <div className="space-y-8 pt-2">
      <section>
        <p className="section-label mb-3">the next few hours</p>
        <div className="rounded-2xl border border-divider bg-card p-5">
          <HourlyStrip />
        </div>
      </section>
      <div className="rounded-2xl border border-divider bg-card p-5">
        <Forecast7Day />
      </div>
    </div>
  );
}
