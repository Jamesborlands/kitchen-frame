"use client";
import { useEffect, useState } from "react";
import { useFrame } from "@/lib/hooks/useFrame";
import { BOARD_FILLERS } from "@/lib/frame/boardMessages";
import { TextFlippingBoard } from "@/components/ui/text-flipping-board";
import { BOARD_ROWS, BOARD_COLS, paginate } from "@/lib/frame/boardText";
import { initials } from "@/lib/initials";

type Slide = { text: string; from?: string };

export function FamilyMessageBoard({
  className,
  rowCount,
  cols,
}: {
  className?: string;
  rowCount?: number;
  cols?: number;
}) {
  const { data } = useFrame();
  const recent = (data?.notes ?? []).slice(0, 5);

  // Pages are sized to the board so a long note flips through several screens
  // instead of being cut off. Dims default to the full board.
  const rows = rowCount ?? BOARD_ROWS;
  const wide = cols ?? BOARD_COLS;

  // Family messages when there are any; otherwise drift through poems & trivia.
  // The sender no longer takes a board row — it's shown as a small badge — so
  // the message gets the whole board.
  const hasMessages = recent.length > 0;
  const slides: Slide[] = hasMessages
    ? recent.flatMap((m) => paginate(m.text, wide, rows).map((text) => ({ text, from: m.from })))
    : BOARD_FILLERS.flatMap((f) => paginate(f, wide, rows).map((text) => ({ text })));

  const [i, setI] = useState(0);

  // a leisurely rotation — one message every 30s
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setI((n) => (n + 1) % slides.length), 30_000);
    return () => clearInterval(id);
  }, [slides.length]);

  // when a brand-new message arrives, flip straight to it (adjusting state
  // during render, so the new message shows on this render, not the next)
  const newestId = recent[0]?.id;
  const [shownNewest, setShownNewest] = useState(newestId);
  if (newestId !== shownNewest) {
    setShownNewest(newestId);
    setI(0);
  }

  const slide = slides[i] ?? slides[0] ?? { text: "HELLO" };

  return (
    <div className="relative">
      <TextFlippingBoard text={slide.text} className={className} rowCount={rowCount} cols={cols} />
      {slide.from && (
        <span
          title={slide.from}
          aria-label={`from ${slide.from}`}
          className="absolute flex items-center justify-center rounded-full font-medium"
          style={{
            right: "0.85rem",
            bottom: "0.85rem",
            width: "2.1rem",
            height: "2.1rem",
            background: "var(--color-sage)",
            color: "color-mix(in srgb, var(--color-paper) 96%, transparent)",
            fontSize: "0.72rem",
            letterSpacing: "0.04em",
          }}
        >
          {initials(slide.from)}
        </span>
      )}
    </div>
  );
}
