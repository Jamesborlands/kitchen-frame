import type { ReactNode } from "react";

// SVG paths for the 8 lunar phases.
// Convention: lit side = right for waxing, left for waning.
// viewBox="0 0 24 24", disc centred at (12,12) r=10.
// Outline circle always drawn via stroke; fill patches overlay the lit area.

const phaseShapes: Record<string, ReactNode> = {
  "new moon": (
    // Outline only — nothing filled
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
  ),

  "full moon": (
    // Fully filled disc
    <circle cx="12" cy="12" r="10" fill="currentColor" />
  ),

  "first quarter": (
    // Right half filled (waxing — light on right)
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/* Right semicircle: arc from top (12,2) → bottom (12,22) sweeping right */}
      <path
        d="M12 2 A10 10 0 0 1 12 22 Z"
        fill="currentColor"
      />
    </>
  ),

  "last quarter": (
    // Left half filled (waning — light on left)
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/* Left semicircle: arc from top (12,2) → bottom (12,22) sweeping left */}
      <path
        d="M12 2 A10 10 0 0 0 12 22 Z"
        fill="currentColor"
      />
    </>
  ),

  "waxing crescent": (
    // Thin lit crescent on the RIGHT.
    // Right half disc minus an ellipse shifted left to leave a crescent sliver.
    // Built as: right semicircle MINUS left-leaning ellipse terminator.
    // We use a clip-path approach: draw the right half-disc, then cut out the
    // left portion via an overlapping ellipse in the shadow colour — but since
    // we have no shadow colour token, we use SVG evenodd fill rule instead.
    // Shape: outer arc (right semicircle) + inner ellipse arc (terminator curving back)
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/*
        Crescent path (waxing = lit on right):
        Start at top (12,2), arc right semicircle to bottom (12,22),
        then arc back via an ellipse (rx=6, ry=10) that curves to the LEFT,
        bringing us back to (12,2). Fill-rule evenodd ensures correct shape.
        The inner ellipse rx=6 gives a thin crescent.
      */}
      <path
        d="M12 2 A10 10 0 0 1 12 22 A6 10 0 0 1 12 2 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </>
  ),

  "waning crescent": (
    // Thin lit crescent on the LEFT.
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/*
        Waning crescent (lit on left):
        Start at top (12,2), arc LEFT semicircle to bottom (12,22) (sweep-flag 0),
        then inner ellipse sweeps back right (sweep-flag 0) to (12,2).
      */}
      <path
        d="M12 2 A10 10 0 0 0 12 22 A6 10 0 0 0 12 2 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </>
  ),

  "waxing gibbous": (
    // Mostly filled — unlit crescent on the LEFT.
    // Full disc minus a thin crescent on the left = gibbous.
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/*
        Full disc filled, then subtract unlit left crescent via evenodd.
        Outer: full circle path.
        Inner: left crescent (same as waning crescent inner shape).
        evenodd means overlap cancels out → leaves gibbous lit area.
      */}
      <path
        d="M12 2 A10 10 0 1 1 12 22 A10 10 0 1 1 12 2 Z M12 2 A10 10 0 0 0 12 22 A6 10 0 0 0 12 2 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </>
  ),

  "waning gibbous": (
    // Mostly filled — unlit crescent on the RIGHT.
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/*
        Full disc minus right crescent (waxing crescent shape as the hole).
      */}
      <path
        d="M12 2 A10 10 0 1 1 12 22 A10 10 0 1 1 12 2 Z M12 2 A10 10 0 0 1 12 22 A6 10 0 0 1 12 2 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </>
  ),
};

const fallback: ReactNode = (
  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
);

export function MoonIcon({
  phase,
  className,
}: {
  phase: string;
  className?: string;
}) {
  const shape = phaseShapes[phase] ?? fallback;

  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {shape}
    </svg>
  );
}
