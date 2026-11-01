import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  env: {
    // Baked in at build: the commit this build came from. The kitchen compares
    // it with /api/version to notice a new deploy (see app/kitchen/KitchenRefresh).
    APP_VERSION: process.env.GITHUB_SHA ?? process.env.WORKERS_CI_COMMIT_SHA ?? "",
  },
};

export default nextConfig;

// `next dev` gets the Cloudflare bindings (R2, KV) from wrangler.jsonc, emulated locally.
initOpenNextCloudflareForDev();
