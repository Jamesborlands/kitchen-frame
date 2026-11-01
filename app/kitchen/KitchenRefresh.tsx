"use client";
import { useEffect } from "react";
import { REFRESH } from "@/lib/config";
import { shouldReload } from "@/lib/kitchen/schedule";

// The widgets refresh their own data, so the page reloads only for a new deploy
// or the nightly refresh. It checks /api/version first and stays put if that
// fails: reloading while the Wi-Fi is down would swap the dashboard for the
// browser's error page, with nothing left to bring it back.
export function KitchenRefresh({ version }: { version: string | null }) {
  useEffect(() => {
    const loadedAt = new Date();
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version: liveVersion } = (await res.json()) as { version: string | null };
        if (shouldReload({ now: new Date(), loadedAt, builtVersion: version, liveVersion })) {
          window.location.reload();
        }
      } catch {
        // offline or signed out — keep showing what we have
      }
    }, REFRESH.dataMs);
    return () => clearInterval(id);
  }, [version]);
  return null;
}
