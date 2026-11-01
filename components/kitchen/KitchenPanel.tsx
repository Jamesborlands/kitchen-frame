"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { KITCHEN } from "@/lib/config";
import { PanelErrorBoundary } from "@/components/kitchen/PanelErrorBoundary";

// A full-screen sheet over the kitchen dashboard. The frame runs as a locked
// kiosk with no back button and gets tapped by accident, so every panel has a
// big close button, closes on a tap outside, and closes itself after
// KITCHEN.panelIdleMs without a touch.
export function KitchenPanel({
  title,
  onClose,
  children,
  idleMs = KITCHEN.panelIdleMs,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  idleMs?: number;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const arm = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => closeRef.current(), idleMs);
  };

  useEffect(() => {
    arm();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- arm once on open; touches re-arm
  }, [idleMs]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm"
      onPointerDown={arm}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full max-h-[56rem] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-divider bg-paper shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between px-8 pb-2 pt-6">
          <p className="section-label">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="flex size-14 items-center justify-center rounded-full border border-divider bg-card text-2xl text-muted active:bg-divider"
          >
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">
          <PanelErrorBoundary>{children}</PanelErrorBoundary>
        </div>
      </div>
    </div>
  );
}
