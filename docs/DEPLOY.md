# cottage-view — going live (your checklist)

_Hosting is **Cloudflare Workers**. This page is for a fresh setup._

The app is **fail-soft**: it runs with **zero environment variables**. Each secret below only switches on an extra. Do the stages in order; you can stop after any of them.

---

## Stage 1 — Get it live (≈15 min, free)

1. Sign up at **dash.cloudflare.com** (free plan).
2. On a laptop:
   ```bash
   git clone https://github.com/<your-github-user>/cottage-view && cd cottage-view
   npm ci
   npx wrangler login
   npm run cf:setup      # creates the R2 buckets + KV namespace, writes the KV id into wrangler.jsonc
   git commit -am "chore: set FRAME KV namespace id" && git push
   npm run deploy
   ```
3. It's live at `https://cottage-view.<your-subdomain>.workers.dev`.
4. Add the PIN gate: `npx wrangler secret put SITE_PIN`.
5. **Auto-deploy on push:** Cloudflare → **Workers & Pages → cottage-view → Settings → Build → Connect** → GitHub repo.
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx opennextjs-cloudflare deploy`
   - Non-production branch deploy command: `npx opennextjs-cloudflare upload`

That address already works: weather, the 7-day strip, the map (OpenTopoMap + CyclOSM), curated routes, flood, news, what's-on, family clocks and `/kitchen`.

_Optional: **Settings → Domains & Routes** adds your own domain, if its DNS is on Cloudflare._

---

## Stage 2 — OS Maps base layer (optional, free, ≈10 min)

Adds the Ordnance Survey "Outdoor" map as a layer option. Without it, that one layer is simply missing; nothing breaks.

1. Sign up at **osdatahub.os.uk** → create an **API project** → add the **OS Maps API** → copy the key.
2. The key is baked in at build time (it's a `NEXT_PUBLIC_` key):
   - **Workers Builds:** **Settings → Build → Variables** → add `NEXT_PUBLIC_OS_API_KEY`, then redeploy.
   - **Deploying from a laptop:** put `NEXT_PUBLIC_OS_API_KEY=…` in `.env.local`, then `npm run deploy`.
3. In OS Data Hub, **restrict the key** to your workers.dev address (and any custom domain). The key ships to the browser, so the domain restriction is what keeps it safe.

---

## Stage 3 — The kitchen screen (hardware)

1. A landscape 10–16″ screen. Any of these work:
   - **iPad**, wall-mounted, with **Guided Access**.
   - **Amazon Fire HD 10** with **Fully Kiosk Browser**.
   - **A hacked Android photo frame**: see Wes Bos's `photo-frame-dashboard`. It needs a browser engine of Chrome 111+ or Firefox 128+.
2. Point the browser at **`https://<your-address>/kitchen`** and enter the PIN once.
3. Keep it on power. What it does by itself:
   - Every widget updates its own data.
   - The page reloads only for a new deploy, or once around 4am.
   - Night mode dims it from 11pm to 6am.

---

## Stage 4 — WhatsApp photo frame (optional, ≈30 min)

The family texts photos and notes to a number, and they appear on `/kitchen`. The storage (R2 + KV) was created in Stage 1, so this stage is just the Meta setup. See [`whatsapp-setup.md`](whatsapp-setup.md).

1. **Meta:**
   - Create a Meta Business app, add the WhatsApp product and a phone number.
   - Set the webhook to `https://<your-address>/api/whatsapp`, with your verify token.
   - Subscribe to **messages**.
2. **Secrets** (`npx wrangler secret put NAME`, or the dashboard under **Settings → Variables and Secrets**):
   - `WHATSAPP_VERIFY_TOKEN`: any random string you choose. It must match the webhook.
   - `WHATSAPP_TOKEN`: the Meta System User access token.
   - `WHATSAPP_ALLOWED` _(optional)_: comma-separated allowed sender numbers.
   - `WHATSAPP_PHONE_NUMBER_ID` _(optional)_: turns on the ❤️ button.
3. Send a test text and a test photo, and check `/kitchen`.

---

## TL;DR
**Stages 1–3** get the dashboard live on the wall. **Stage 4** is the Meta setup for the WhatsApp frame, whenever you want it.
