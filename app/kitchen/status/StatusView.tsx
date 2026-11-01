// The admin's view of the kitchen frame from anywhere: when it last checked in,
// how it was, and buttons to send it a command. Pure — data comes in as props.
import { COMMANDS, type DebugMeta, type FrameCommand, type StoredCheckin } from "@/lib/kitchen/opsTypes";

export interface FrameStatus {
  checkin: StoredCheckin | null;
  pendingCommand: FrameCommand | null;
  debug: DebugMeta;
}

const QUIET_AFTER_MS = 25 * 60_000; // checks in every 10 min; two misses = worth a look

export function lastSeenLabel(at: number | null, now: number): string {
  if (at === null) return "never";
  const mins = Math.floor((now - at) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 120) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function StatusView({
  status, onCommand, now,
}: { status: FrameStatus; onCommand: (c: FrameCommand) => void; now: number }) {
  const c = status.checkin;
  const quiet = !c || now - c.at > QUIET_AFTER_MS;
  return (
    <div className="mx-auto max-w-xl space-y-5 p-6">
      <h1 className="font-[family-name:var(--font-cormorant)] text-3xl">kitchen frame</h1>
      <section className="space-y-1 rounded-xl border border-divider bg-card p-4">
        <p>last seen {lastSeenLabel(c?.at ?? null, now)}</p>
        {quiet && <p className="text-sm" style={{ color: "#7E3A33" }}>it hasn&apos;t checked in recently — try Tailscale</p>}
        {c && (
          <ul className="text-sm text-muted">
            <li>version {c.versionCode} · up {Math.floor(c.uptimeS / 3600)}h</li>
            <li>last feed {lastSeenLabel(c.lastFeedOkAt, now)} · {c.freeMemMb} MB free</li>
            <li>wi-fi {c.wifiRssi ?? "?"} dBm · tailscale {c.tailscaleUp ? "up" : "down"}</li>
            {c.lastError && <li>last error: {c.lastError}</li>}
          </ul>
        )}
      </section>
      <section className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {COMMANDS.filter((c) => !c.startsWith("show-")).map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => onCommand(cmd)}
              className="rounded-full border border-divider bg-card px-4 py-1.5 text-sm active:bg-divider/40"
            >
              {cmd}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">Show me a panel (the frame opens it, takes a screenshot, and closes it — at its next check-in):</p>
        <div className="flex flex-wrap gap-2">
          {COMMANDS.filter((c) => c.startsWith("show-")).map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => onCommand(cmd)}
              className="rounded-full border border-divider bg-card px-4 py-1.5 text-sm active:bg-divider/40"
            >
              {cmd.slice(5)}
            </button>
          ))}
        </div>
        {status.pendingCommand && <p className="text-sm text-muted">waiting: {status.pendingCommand} (picked up at the next check-in)</p>}
      </section>
      <section className="space-y-2 text-sm text-muted">
        <p>screenshot {lastSeenLabel(status.debug.screenshotAt, now)} · logs {lastSeenLabel(status.debug.logsAt, now)}</p>
        {status.debug.screenshotAt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/kitchen/debug?kind=screenshot&t=${status.debug.screenshotAt}`} alt="latest frame screenshot" className="w-full rounded-xl border border-divider" />
        )}
        {status.debug.logsAt && (
          // an API route serving a text file, not a page — <Link> doesn't apply
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a className="underline" href="/api/kitchen/debug?kind=logs">open latest logs</a>
        )}
      </section>
    </div>
  );
}
