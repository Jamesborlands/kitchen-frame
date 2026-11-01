"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { WatercolorScene } from "@/components/WatercolorScene";

export default function UnlockPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setBusy(false);
    if (res.ok) {
      // back to where the gate stopped them (same-site paths only)
      const from = new URLSearchParams(window.location.search).get("from");
      router.replace(from && from.startsWith("/") && !from.startsWith("//") ? from : "/");
    } else {
      setError(true);
      setPin("");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs text-center">
        <WatercolorScene
          sceneKey="place-ludlow"
          alt="Ludlow"
          className="mx-auto mb-6 w-40 rounded-xl"
        />
        <h1 className="text-3xl">cottage view</h1>
        <p className="text-muted mb-6">a quiet view of home &amp; the family.</p>

        <form onSubmit={submit} className="flex flex-col items-center gap-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="enter the pin"
            aria-label="pin"
            className="w-full rounded-xl border border-divider bg-card px-4 py-2.5 text-center tracking-[0.3em] outline-none focus:border-sage"
          />
          <button
            type="submit"
            disabled={busy || pin.length === 0}
            className="w-full rounded-xl bg-sage px-4 py-2.5 text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : "unlock"}
          </button>
          {error && (
            <p className="text-sm" style={{ color: "#B0504A" }}>
              that&rsquo;s not it — try again
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
