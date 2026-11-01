import { NightCurtain } from "@/components/NightCurtain";
import { KitchenRefresh } from "./KitchenRefresh";
import { KitchenDashboard } from "./KitchenDashboard";

// Fixed landscape screen (a ~10–16″ tablet or hacked photo frame) — fills one
// screen, no scroll. The dashboard itself is client-side so it can open panels.
export default function KitchenPage() {
  return (
    <main className="flex h-screen w-screen flex-col gap-3 overflow-hidden p-5">
      <KitchenRefresh version={process.env.APP_VERSION || null} />
      <NightCurtain />
      <KitchenDashboard />
    </main>
  );
}
