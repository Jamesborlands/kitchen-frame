"use client";
import { useState } from "react";
import type { PremadeRoute } from "@/lib/map/routes";
import { FullMap } from "@/components/FullMap";
import { RouteDetail } from "@/components/RouteDetail";
import { RidingConditions } from "@/components/RidingConditions";
import { SuggestedRoutes } from "@/components/SuggestedRoutes";
import { Wildlife } from "@/components/Wildlife";

export function MapHub() {
  const [selected, setSelected] = useState<PremadeRoute | null>(null);

  return (
    <>
      <FullMap selectedRoute={selected} />
      <RouteDetail route={selected} onClear={() => setSelected(null)} />
      <div className="mx-auto max-w-6xl mt-8 space-y-2">
        <RidingConditions />
        <SuggestedRoutes selected={selected} onSelect={setSelected} />
        <Wildlife />
      </div>
    </>
  );
}
