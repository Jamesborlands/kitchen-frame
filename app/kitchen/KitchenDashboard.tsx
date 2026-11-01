"use client";
import { useState } from "react";
import { TodayWeather } from "@/components/TodayWeather";
import { FamilyClocks } from "@/components/FamilyClocks";
import { NoticeBoard } from "@/components/NoticeBoard";
import { PhotoFrame } from "@/components/PhotoFrame";
import { WarningBanner } from "@/components/WarningBanner";
import { LocationDetailBody } from "@/components/LocationDetail";
import { KitchenPanel } from "@/components/kitchen/KitchenPanel";
import { WeatherPanel } from "@/components/kitchen/WeatherPanel";
import { PhotoPanel } from "@/components/kitchen/PhotoPanel";
import { MessagesPanel } from "@/components/kitchen/MessagesPanel";
import type { GeoLocation } from "@/lib/config";

type Panel =
  | { kind: "weather" }
  | { kind: "place"; location: GeoLocation }
  | { kind: "photo"; index: number }
  | { kind: "messages" };

const TITLES: Record<Panel["kind"], string> = {
  weather: "weather in ludlow",
  place: "",
  photo: "from the family",
  messages: "messages from the family",
};

// Fixed landscape layout that fills one screen, no scroll. Left: weather, the
// four family clocks and a "worth noticing" card. Right: the WhatsApp photo
// frame. Everything is tappable and opens a panel over the top (see KitchenPanel).
export function KitchenDashboard() {
  const [panel, setPanel] = useState<Panel | null>(null);
  const close = () => setPanel(null);

  return (
    <>
      <WarningBanner className="shrink-0" />

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.3fr] gap-5">
        {/* left — the weather watercolour grows to fill the column; clocks and
            the notice sit beneath it, no dead whitespace */}
        <div className="flex min-h-0 flex-col gap-4 overflow-hidden [&_section]:py-0">
          <div
            role="button"
            tabIndex={0}
            aria-label="open the weather forecast"
            onClick={() => setPanel({ kind: "weather" })}
            onKeyDown={(e) => {
              if (e.key === "Enter") setPanel({ kind: "weather" });
            }}
            className="flex min-h-0 flex-1 cursor-pointer flex-col"
          >
            <TodayWeather fill />
          </div>
          <FamilyClocks onSelect={(location) => setPanel({ kind: "place", location })} />
          <NoticeBoard compact tapToAdvance className="overflow-hidden" />
        </div>

        {/* right — photo frame fills the column */}
        <div className="min-h-0 overflow-hidden">
          <PhotoFrame
            fill
            className="h-full"
            onOpenPhoto={(index) => setPanel({ kind: "photo", index })}
            onOpenNotes={() => setPanel({ kind: "messages" })}
          />
        </div>
      </div>

      {panel && (
        <KitchenPanel
          title={panel.kind === "place" ? panel.location.label.toLowerCase() : TITLES[panel.kind]}
          onClose={close}
        >
          {panel.kind === "weather" && <WeatherPanel />}
          {panel.kind === "place" && <LocationDetailBody location={panel.location} split />}
          {panel.kind === "photo" && <PhotoPanel startIndex={panel.index} />}
          {panel.kind === "messages" && <MessagesPanel />}
        </KitchenPanel>
      )}
    </>
  );
}
