# WhatsApp Photo Frame Setup

Connect WhatsApp messages to the `/kitchen` photo frame: the family texts a photo or note to a number and it appears on the kitchen tablet.

**Status (2026-10-29):** live on a real number, **+1 555-010-0199** (a placeholder here) (Google Voice; keep it active with a call or text every couple of months or Google reclaims it). Details: `docs/kitchen-frame.md`, 2026-10-29 entry.

**Don't rely on Meta's free test number.** Meta deleted ours after a few weeks, and it only ever accepted messages from a short recipient list. To add a real number: Business Suite → Settings → WhatsApp accounts → **Add** → *Create a new WhatsApp account* (needs a number not already on WhatsApp; choose **phone call** verification for a Google Voice number). Then give the *Employee* system user access to it, `POST <messaging account id>/subscribed_apps` (Graph API Explorer works), and point the household at the new phone number id (`node scripts/household.mjs set-whatsapp <household> <id>`, plus `WHATSAPP_PHONE_NUMBER_ID` for the frame household).

**Groups:** a Cloud API number can't be added to an ordinary WhatsApp group; forward photos to it from a group instead.

The app reads these WhatsApp env vars: `WHATSAPP_VERIFY_TOKEN` (set ✅), `WHATSAPP_TOKEN` (add in Step 3), optional `WHATSAPP_ALLOWED`, and optional `WHATSAPP_PHONE_NUMBER_ID` — only needed for the kitchen's ❤️ button, the one thing that sends (Step 6).

---

## Step 1 — Create a Meta Business App with WhatsApp

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**.
2. Choose **Business** app type.
3. Add the **WhatsApp** product to the app.
4. Under **WhatsApp → API Setup**, you get a free **test phone number** to start (you can add a real number later).

---

## Step 2 — Configure the Webhook

1. In the Meta dashboard: **WhatsApp → Configuration → Webhook → Edit**.
2. Set:
   - **Callback URL:** `https://<your-address>/api/whatsapp` (e.g. `https://cottage-view.<subdomain>.workers.dev/api/whatsapp`)
   - **Verify Token:** a long random string you choose (e.g. `openssl rand -hex 24`)  ← set as the `WHATSAPP_VERIFY_TOKEN` secret
3. Click **Verify and Save**. Meta calls `GET /api/whatsapp?...` and the route echoes the challenge back, so it should verify instantly (the site is already deployed).
4. Under **Webhook Fields**, subscribe to **messages**.

---

## Step 3 — Add an Access Token

The token shown on the API Setup page is a **24h test token** — fine for a first test, but it expires. For something permanent:

1. **Business Settings → System Users → Add** — create a system user.
2. Give it the **WhatsApp Business Messaging** permission on the app.
3. **Generate New Token** → select the app → copy the permanent token.
4. Save it as a Worker secret: `npx wrangler secret put WHATSAPP_TOKEN` (or Cloudflare → Workers & Pages → cottage-view → **Settings → Variables and Secrets**).

---

## Step 4 — Redeploy and test

1. Nothing to redeploy — Worker secrets take effect immediately.
2. From WhatsApp, send a **text** to the number → it appears as a note on `/kitchen` within ~1 minute.
3. Send a **photo** → it's downloaded, stored in R2, and shown in the frame.

---

## Step 5 — Allowlist family numbers (optional)

Set `WHATSAPP_ALLOWED` to a comma-separated list of E.164 numbers to ignore everyone else:

```
WHATSAPP_ALLOWED=+447911123456,+14155552671
```

If unset, all senders are accepted (fine for a private number you only share with family).

---

## Step 6 — ❤️ hearts from the kitchen (optional)

On `/kitchen`, tap a photo → **send a heart**. It lands as a ❤️ reaction on the sender's original WhatsApp message, from the family number.

1. Meta → your app → **WhatsApp → API Setup** → copy the **Phone number ID** (a long number, not the phone number itself).
2. `npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID` (takes effect immediately).
3. Make sure the System User token from Step 3 has the **`whatsapp_business_messaging`** permission (it's needed to send).

Until it's set, the heart button simply doesn't appear. WhatsApp only allows a business number to message someone within **24 hours** of their last message to it, so a photo can be hearted for a day after it arrives, once. Photos received before this change have no WhatsApp message id stored, so they can't be hearted.

---

## Already done (for reference)

- **Photo upload** — `lib/frame/media.ts` downloads the media from Meta and stores it in the private R2 bucket `cottage-view-photos`; `/api/photo` serves it back behind the PIN.
- **Durable store** — `lib/frame/store.ts` keeps the photo/note records in the Workers KV namespace `cottage-view-frame` (binding `FRAME`).
- **Fail-soft** — if a photo can't be stored, it falls back to a `📷 <caption>` note; without the bindings (local tests) `/kitchen` shows demo seed data, and never blanks.
- The kitchen polls every 30s — about 6k KV reads a day, well inside the free 100k.
