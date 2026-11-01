import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

// The API routes cache upstream feeds for 30 minutes (`export const revalidate`).
// R2 holds that cache (KV's free tier only allows 1,000 writes a day), and the
// memory queue revalidates in the background via WORKER_SELF_REFERENCE.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: memoryQueue,
});
