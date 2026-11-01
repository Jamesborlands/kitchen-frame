"use client";

import { Section } from "@/components/Section";
import { useSnow } from "@/lib/hooks/useSnow";
import type { GeoLocation } from "@/lib/config";

export function SnowReport({ location }: { location: GeoLocation }) {
  const { data } = useSnow(location);

  return (
    <Section label="snow report">
      <div className="space-y-2">
        {data ? (
          <>
            <p className="text-sm text-muted">
              snow depth — {data.snowDepthCm !== null ? `${data.snowDepthCm}cm` : "—"}
            </p>
            <p className="text-sm text-muted">
              last few days — {data.recentSnowfallCm !== null ? `${data.recentSnowfallCm}cm new` : "—"}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">snow data unavailable</p>
        )}
        <p className="text-xs text-muted">lift status: check the resort</p>
      </div>
    </Section>
  );
}
