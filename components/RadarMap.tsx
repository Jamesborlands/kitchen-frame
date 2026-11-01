"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as LType from "leaflet";
import { HOME } from "@/lib/config";

interface RadarFrame {
  time: number; // unix seconds
  path: string;
}

// Animated rain radar over a calm base map, via RainViewer (free, keyless).
// Cycles through the last ~2h of frames plus the short nowcast, looping.
export function RadarMap({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameTime, setFrameTime] = useState<number | null>(null);

  useEffect(() => {
    let map: LType.Map | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || containerRef.current.dataset.init) return;
      containerRef.current.dataset.init = "1";

      map = L.map(containerRef.current, { attributionControl: true, scrollWheelZoom: false }).setView(
        [HOME.latitude, HOME.longitude],
        7,
      );
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18,
      }).addTo(map);
      // home, marked in the same clay tone as the warning accent
      L.circleMarker([HOME.latitude, HOME.longitude], {
        radius: 5,
        color: "#FFFFFF",
        weight: 2,
        fillColor: "#B0504A",
        fillOpacity: 1,
      }).addTo(map);

      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        if (!res.ok || cancelled || !map) return;
        const data = (await res.json()) as {
          host: string;
          radar?: { past?: RadarFrame[]; nowcast?: RadarFrame[] };
        };
        const frames = [...(data.radar?.past ?? []), ...(data.radar?.nowcast ?? [])];
        if (frames.length === 0) return;

        const target = map;
        const layers = frames.map((f) =>
          L.tileLayer(`${data.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, {
            opacity: 0,
            zIndex: 5,
          }).addTo(target),
        );

        let idx = frames.length - 1;
        const show = (i: number) => {
          layers.forEach((layer, j) => layer.setOpacity(j === i ? 0.65 : 0));
          setFrameTime(frames[i].time);
        };
        show(idx);
        timer = setInterval(() => {
          idx = (idx + 1) % frames.length;
          show(idx);
        }, 650);
      } catch {
        // radar overlay is optional — the base map still renders
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      map?.remove();
    };
  }, []);

  const label =
    frameTime !== null
      ? `rain radar · ${new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/London",
        }).format(new Date(frameTime * 1000))}`
      : "rain radar";

  return (
    <div className={className}>
      <div
        ref={containerRef}
        role="img"
        aria-label="rain radar map"
        className="w-full overflow-hidden rounded-xl"
        style={{ height: 400 }}
      />
      <p className="section-label mt-2">{label}</p>
    </div>
  );
}
