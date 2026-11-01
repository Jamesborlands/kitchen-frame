"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export function ExploreMap() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      try {
        const L = await import("leaflet");
        if (cancelled || !ref.current || ref.current.dataset.init) return;
        ref.current.dataset.init = "1";
        const osKey = process.env.NEXT_PUBLIC_OS_API_KEY;
        map = L.map(ref.current, {
          scrollWheelZoom: false,
          attributionControl: true,
          ...(osKey ? { maxZoom: 16 } : {}),
        }).setView([52.3675, -2.7181], 12);
        if (osKey) {
          L.tileLayer(
            `https://api.os.uk/maps/raster/v1/zxy/Outdoor_3857/{z}/{x}/{y}.png?key=${osKey}`,
            {
              maxZoom: 16,
              attribution:
                "Contains OS data &copy; Crown copyright and database right 2026",
            }
          ).addTo(map);
        } else {
          L.tileLayer(
            "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
            {
              subdomains: "abc",
              maxZoom: 18,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="https://www.cyclosm.org">CyclOSM</a>',
            }
          ).addTo(map);
        }
      } catch {
        /* leaflet unavailable (e.g. jsdom) — leave the placeholder */
      }
    })();
    return () => { cancelled = true; if (map) map.remove(); };
  }, []);
  return (
    <div
      ref={ref}
      role="img"
      aria-label="map of paths and cycle routes around Ludlow"
      className="h-80 w-full overflow-hidden rounded-2xl border border-divider bg-card"
    />
  );
}
