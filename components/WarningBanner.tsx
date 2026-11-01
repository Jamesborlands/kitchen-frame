"use client";
import { useWarnings } from "@/lib/hooks/useWarnings";
import { warningEndDay, type WarningLevel } from "@/lib/sources/warnings";

// Muted, paper-friendly tones — alert but never garish, to sit calmly with the
// rest of the dashboard.
const TONE: Record<WarningLevel, { bg: string; fg: string; dot: string }> = {
  red: { bg: "#F1DAD6", fg: "#7E3A33", dot: "#B0504A" },
  amber: { bg: "#F2E5CF", fg: "#7E5622", dot: "#C0833A" },
  yellow: { bg: "#EFE8CE", fg: "#6E6230", dot: "#B6A03C" },
};

export function WarningBanner({ className = "" }: { className?: string }) {
  const { warnings } = useWarnings();
  const top = warnings?.[0];
  if (!top) return null;

  const tone = TONE[top.level];
  const until = warningEndDay(top.period);

  return (
    <a
      href={top.link || "https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings"}
      target="_blank"
      rel="noreferrer"
      aria-label={`${top.level} weather warning: ${top.type}`}
      className={`flex items-center gap-2.5 rounded-xl px-4 py-1.5 leading-tight transition-opacity hover:opacity-90 ${className}`}
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: tone.dot }}
        aria-hidden
      />
      <span className="text-sm">
        <span className="font-medium">{top.level} weather warning</span>
        <span className="opacity-80">
          {" · "}
          {top.type}
          {until ? ` until ${until}` : ""}
        </span>
      </span>
    </a>
  );
}
