import { moonPhase } from "@/lib/time/moon";
import { MoonIcon } from "@/components/MoonIcon";

export function MoonPhase({ date = new Date(), onImage = false }: { date?: Date; onImage?: boolean }) {
  const { name, illumination } = moonPhase(date);
  const pct = Math.round(illumination * 100);

  return (
    <div className={`flex items-center gap-1.5 text-sm ${onImage ? "text-paper/85" : "text-muted"}`}>
      <MoonIcon phase={name} className={onImage ? "text-paper/80" : "text-sage opacity-70"} />
      <span>
        moon &mdash; {name} &middot; {pct}% lit
      </span>
    </div>
  );
}
