"use client";
import Link from "next/link";
import { Section } from "@/components/Section";
import { useFlood } from "@/lib/hooks/useFlood";
import { Sparkline } from "@/components/Sparkline";

export function Flood() {
  const { data, error } = useFlood();

  if (!data) {
    return (
      <Section label="flood watch">
        <p className="text-muted">
          {error ? "couldn't load flood data." : "loading…"}
        </p>
      </Section>
    );
  }

  const { warnings, rivers } = data;

  return (
    <Section label="flood watch">
      <div className="space-y-4">
        {warnings.length > 0 ? (
          <ul className="space-y-2">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm">
                <span className="text-sage">{w.severity}</span>
                {w.area ? ` — ${w.area}` : ""}
                {w.message ? ` — ${w.message}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">no flood warnings right now.</p>
        )}

        {rivers.length > 0 && (
          <ul className="space-y-1 text-sm text-muted">
            {rivers.slice(0, 2).map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <span>{r.river}{r.level !== null ? ` — ${r.level.toFixed(2)}${r.unit}` : ""}</span>
                {(r.history?.length ?? 0) >= 2 && (
                  <Sparkline values={r.history} className="text-sage opacity-60" />
                )}
              </li>
            ))}
          </ul>
        )}

        <Link href="/flood" className="section-label mt-2 inline-block">see the rivers ↗</Link>
      </div>
    </Section>
  );
}
