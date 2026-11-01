"use client";
import { useEffect } from "react";

const RETRY_MS = 30_000;

// Last line of defence for the wall screen: nobody is there to press "try again",
// so show a calm note and retry on our own every 30s until the dashboard is back.
export default function KitchenError({ unstable_retry }: { error: Error; unstable_retry: () => void }) {
  useEffect(() => {
    const id = setInterval(() => unstable_retry(), RETRY_MS);
    return () => clearInterval(id);
  }, [unstable_retry]);

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="font-[family-name:var(--font-cormorant)] text-4xl">just a moment…</p>
      <p className="text-muted">the kitchen screen hit a snag and will try again shortly.</p>
    </main>
  );
}
