"use client";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNotice } from "@/lib/hooks/useNotice";
import { NOTICE_KIND_COLORS } from "@/lib/notice/kinds";

// A small line-icon + accent colour per notice kind, drawn from the warm
// palette so each card reads as its own little dispatch rather than a flat line
// of text. Unknown kinds fall back to a neutral sage sparkle.
const ICON = {
  quake: (
    <>
      <circle cx="12" cy="12" r="1.6" />
      <path d="M7.5 9a6 6 0 0 0 0 6M16.5 9a6 6 0 0 1 0 6" />
    </>
  ),
  cloud: <path d="M7 17.5a3.5 3.5 0 0 1 .3-7A4.5 4.5 0 0 1 16 9.6a3 3 0 0 1 1 5.9Z" />,
  sparkle: <path d="M12 4.5l1.6 4.9 4.9 1.6-4.9 1.6L12 19.5l-1.6-4.9L5.5 13l4.9-1.6Z" />,
  calendar: (
    <>
      <rect x="4.5" y="6" width="15" height="13" rx="2" />
      <path d="M4.5 10h15M9 4v3.5M15 4v3.5" />
    </>
  ),
  almanac: (
    <>
      <path d="M5 17h14" />
      <path d="M8.5 17a3.5 3.5 0 0 1 7 0" />
      <path d="M12 6.5v2M6.7 8.7l1.4 1.4M17.3 8.7l-1.4 1.4" />
    </>
  ),
  paper: (
    <>
      <path d="M6 5.5h10.5v13H7.5A1.5 1.5 0 0 1 6 17Z" />
      <path d="M9 9h5M9 12h5M9 15h3" />
    </>
  ),
  heart: <path d="M12 18.5s-6-3.6-6-8.1A3.2 3.2 0 0 1 12 8.6a3.2 3.2 0 0 1 6 1.8c0 4.5-6 8.1-6 8.1Z" />,
  sprig: (
    <>
      <path d="M12 19c0-5 2-8 6-10-1 5-3 7-6 7.5" />
      <path d="M12 19c0-3-1-5-4-6.5 1 3.5 2.5 5 4 5.5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

const KIND_META: Record<string, { color: string; icon: ReactNode }> = {
  quake: { color: NOTICE_KIND_COLORS.quake, icon: ICON.quake },
  weather: { color: NOTICE_KIND_COLORS.weather, icon: ICON.cloud },
  aurora: { color: NOTICE_KIND_COLORS.aurora, icon: ICON.sparkle },
  news: { color: NOTICE_KIND_COLORS.news, icon: ICON.paper },
  family: { color: NOTICE_KIND_COLORS.family, icon: ICON.heart },
  sky: { color: NOTICE_KIND_COLORS.sky, icon: ICON.almanac },
  calendar: { color: NOTICE_KIND_COLORS.calendar, icon: ICON.calendar },
  delight: { color: NOTICE_KIND_COLORS.delight, icon: ICON.sprig },
};
const DEFAULT_META = { color: "var(--color-sage)", icon: ICON.sparkle };

function KindIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function NoticeBoard({
  label = "worth noticing",
  className = "",
  compact = false,
  tapToAdvance = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
  // Kitchen touch screen: a tap shows the next card, and links are dropped (a
  // new tab in the kiosk browser would have no way back).
  tapToAdvance?: boolean;
}) {
  const { cards } = useNotice();
  const list = cards ?? [];
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);
  const [taps, setTaps] = useState(0); // a tap restarts the rotation timer

  useEffect(() => {
    if (list.length <= 1) return;
    let fade: ReturnType<typeof setTimeout> | null = null;
    const timer = setInterval(() => {
      setVisible(false);
      fade = setTimeout(() => {
        setI((n) => (n + 1) % list.length);
        setVisible(true);
      }, 600);
    }, 9000);
    return () => {
      clearInterval(timer);
      if (fade !== null) clearTimeout(fade);
    };
  }, [list.length, taps]);

  if (list.length === 0) return null;
  const card = list[i] ?? list[0];
  const kindMeta = KIND_META[card.kind] ?? DEFAULT_META;
  const meta = card.color ? { ...kindMeta, color: card.color } : kindMeta;

  const advance = () => {
    if (list.length <= 1) return;
    setI((n) => (n + 1) % list.length);
    setVisible(true);
    setTaps((t) => t + 1);
  };

  const title = card.href && !tapToAdvance ? (
    <a href={card.href} target="_blank" rel="noreferrer" className="hover:underline">
      {card.title}
    </a>
  ) : (
    card.title
  );

  return (
    <section className={className} aria-label="worth noticing">
      {!compact && <p className="section-label mb-2">{label}</p>}
      <div
        className={`flex items-start gap-3 rounded-xl border border-divider bg-card p-4 transition-opacity duration-500 ${
          tapToAdvance ? "cursor-pointer select-none active:bg-divider/40" : ""
        }`}
        style={{ opacity: visible ? 1 : 0 }}
        {...(tapToAdvance && {
          role: "button",
          tabIndex: 0,
          "aria-label": "next card",
          onClick: advance,
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") advance();
          },
        })}
      >
        {/* kind glyph in a softly-tinted disc */}
        <span
          className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{
            color: meta.color,
            background: `color-mix(in srgb, ${meta.color} 13%, transparent)`,
          }}
        >
          <KindIcon>{meta.icon}</KindIcon>
        </span>

        <div className="min-w-0 flex-1">
          <p className="section-label mb-1" style={{ color: meta.color }}>
            {card.label}
          </p>
          <p
            className={`font-[family-name:var(--font-cormorant)] text-xl leading-snug text-ink ${
              compact ? "line-clamp-2" : "whitespace-pre-line"
            }`}
          >
            {title}
          </p>
          {!compact && card.detail && (
            <p className="mt-1.5 text-xs text-muted">{card.detail}</p>
          )}
        </div>
      </div>
    </section>
  );
}
