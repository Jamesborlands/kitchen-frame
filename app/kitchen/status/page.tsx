"use client";
import useSWR from "swr";
import { getJson } from "@/lib/hooks/getJson";
import { useNow } from "@/lib/hooks/useNow";
import { StatusView, type FrameStatus } from "@/app/kitchen/status/StatusView";
import type { FrameCommand } from "@/lib/kitchen/opsTypes";

// /kitchen/status — PIN-gated like the rest of the site. Polls the frame's
// status every 30s; buttons queue a command for its next check-in.
export default function KitchenStatusPage() {
  const now = useNow();
  const { data, mutate } = useSWR<FrameStatus>("kitchen-status", () => getJson<FrameStatus>("/api/kitchen/status"), {
    refreshInterval: 30_000,
  });
  const send = async (command: FrameCommand) => {
    await fetch("/api/kitchen/command", { method: "POST", body: JSON.stringify({ command }) });
    await mutate();
  };
  if (!data) return <p className="p-6 text-muted">loading…</p>;
  return <StatusView status={data} onCommand={send} now={now.getTime()} />;
}
