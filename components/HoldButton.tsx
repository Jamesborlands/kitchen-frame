"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// A button you press and hold to confirm (for delete on /family): a fill sweeps
// across while you hold, and letting go early cancels. A quick tap just says
// "keep holding". Works with a held Enter/Space too. A finger that moves is a
// scroll, not a hold; screen readers (whose taps arrive as plain clicks) get
// "activate, then activate again to confirm" instead.

export function HoldButton({
  onConfirm, children, holdMs = 1000, className = "",
}: { onConfirm: () => void; children: ReactNode; holdMs?: number; className?: string }) {
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  const start = () => {
    if (timer.current) return;
    setHint(false);
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onConfirm();
    }, holdMs);
  };
  const release = () => {
    if (timer.current) setHint(true); // let go before it finished
    stop();
  };
  // clicks with detail 0 come from assistive tech or the keyboard, not a finger or mouse
  const onClick = (e: React.MouseEvent) => {
    if (e.detail !== 0) return;
    if (armed) {
      setArmed(false);
      if (armTimer.current) clearTimeout(armTimer.current);
      onConfirm();
      return;
    }
    setArmed(true);
    armTimer.current = setTimeout(() => setArmed(false), 5000);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (armTimer.current) clearTimeout(armTimer.current);
  }, []);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onPointerDown={(e) => { downAt.current = { x: e.clientX, y: e.clientY }; start(); }}
        onPointerMove={(e) => {
          const d = downAt.current;
          if (d && timer.current && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) stop(); // scrolling
        }}
        onPointerUp={release}
        onClick={onClick}
        onPointerLeave={release}
        onPointerCancel={stop}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); start(); } }}
        onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") release(); }}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative min-h-12 select-none overflow-hidden rounded-full border border-[#C9A8A3] bg-card px-5 text-base text-[#7E3A33] ${className}`}
        style={{ touchAction: "manipulation" }}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-[#7E3A33]/15"
          style={{ width: holding ? "100%" : "0%", transition: holding ? `width ${holdMs}ms linear` : "none" }}
        />
        <span className="relative">{armed ? "Tap again to confirm" : children}</span>
      </button>
      {hint && <span className="text-sm text-muted">keep holding to confirm</span>}
    </span>
  );
}
