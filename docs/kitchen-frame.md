# Kitchen frame — hacking a Frameo photo frame into the /kitchen display

_Status 2026-10-11: **read-only survey done; nothing changed on the frame.** It is **not a Frameo**: it runs a VPhoto app on **Android 4.4.2**, which no browser that can render `/kitchen` supports. Route not yet agreed (see "Route options" below). This is done from the laptop, since it needs adb on the local network._

## The device

- **What:** 15.6″ Wi-Fi photo frame from Amazon, sold as 1920×1080 IPS touchscreen, 32 GB.
- **Expected** a Frameo; **actually** runs **VPhoto** (`com.waophoto.smartframe` 2.1.3.35, a system app in `/system/priv-app/CloudPhotoFrame.apk`). Its companion phone app is "VPhoto".
- **Facts found** (adb survey, 2026-10-11):

| | |
|---|---|
| Android version | **4.4.2 KitKat** (SDK 19), build `Classic15-Pro_A33.080124_V02`, dated 2024-08-01. `eng` build, `test-keys` |
| Model / chip | `Classic15 Pro` (`astar_ococci`). **Allwinner A33** (sun8i), 4× Cortex-A7 @ 1.34 GHz, armeabi-v7a, Mali-400 MP (GLES 2.0). Kernel 3.4.39 |
| RAM | **1 GB** (1,027,120 kB; ~520 MB free at the settings screen) |
| Storage | `/data` 27.2 GB (26.9 GB free), `/system` 756 MB (333 MB free) |
| Root (`su`) | **Yes, out of the box.** `adb shell` already runs as `uid=0`; `/system/xbin/su` is setuid root. `ro.secure=0`, `ro.debuggable=1` |
| System WebView | **Chromium 30** (built into the framework: `libwebviewchromium.so`). Not replaceable on 4.4: updatable WebView started with Android 5 |
| Screen (wm size / density) | **1366×768** @ 160 dpi, not the advertised 1920×1080. SurfaceFlinger also composes at 1366×768. The A33 tops out around 1280×800, so the panel may be 1080p behind a scaler, but pages render at 1366×768 either way |
| ADB out of the box? | **Yes, over Wi-Fi, unauthenticated.** `service.adb.tcp.port=5555`, `ro.adb.secure=0`, so no RSA prompt. USB never showed up on the Mac, even with a data cable. Anyone on the same Wi-Fi gets a root shell |
| Browsers / Google | AOSP `com.android.browser` (WebView 30). **No Google Play** (no GMS or Play Store) |
| Other notable packages | `com.adups.fota` (Adups FOTA updater: in 2016 Adups firmware was caught sending phone data to servers in China), `com.softwinner.update`, three Allwinner test apps in `/data/app` (`dragonphone`, `dragonfire`, `videotest`) |

## The one hard constraint

`/kitchen` uses Tailwind v4 and `color-mix()`, so the browser engine must be **Chrome/WebView 111+ or Firefox 128+**. Older engines render broken colours and layout, not just a slightly-off page.

- **Android 7 or newer:** a current Android System WebView can be installed, and the app works as-is. Best case.
- **Android 6:** the newest WebView is **106** (Chromium dropped Android 6 after M106), which is too old. Options:
  1. **Firefox 143**, the last version for Android 5–7. New enough, but harder to lock full screen, and it uses about 370 MB of RAM.
  2. **Wes Bos's WebView kiosk app** (`github.com/wesbos/photo-frame-dashboard`, `dashboard/kiosk`) on WebView 106, plus a build step so `/kitchen` renders on Chrome 106 (down-level the colour functions). That's real work.
- **Reference:** Wes's repo has a full write-up for the 10.1″ BIUFRAME (RK3126, Android 6, shipped with root): `docs/biuframe.md` and `docs/biuframe-setup-guide.md`. It covers the WebView swap (including the compressed-native-libs fix), the Let's Encrypt root missing from Android 6's trust store (affects WebView, not Firefox), swap/zram, the motion sensor and launcher edits.

## Ground rules

- **Keep it returnable** until the owner says otherwise:
  - No flashing, no root exploits.
  - Don't remove the Frameo app in the first pass.
- **Back up before changing `/system`.** Pull anything you'd replace to `./frame-backup/` (git-ignored), and write down the undo steps below.
- **Don't put the site PIN in chat or in files.** The owner types it on the frame.

## Carried over from the earlier Pi plan

An earlier plan, from before the Frameo was bought: a Raspberry Pi 4 driving a 15.6″ monitor in Chromium kiosk mode. The hardware is superseded, but these points still apply:

- **It ships to England.** It's set up here and then posted abroad to Anne & Peter, so after that there's no hands-on fixing:
  - Pre-load their home Wi-Fi (SSID and password from them) so it joins on first power-up.
  - Pack a UK plug or a US→UK adapter for the frame's power supply.
  - Plan for remote access. On the Pi that was Tailscale + SSH; here it would be adb over the network, or nothing. Decide before shipping.
- **It must never get stuck on `/unlock`.** The owner types the PIN once here, and the `cv_session` cookie has to survive reboots and long gaps. The cookie lasts a year (`maxAge: YEAR` in `app/api/unlock/route.ts`), so it lapses about a year after setup unless the browser drops it sooner. The old plan's TODO was a PIN-bypass "kitchen mode" for this reason. Still open.
- **Orientation.** The old plan mounted the screen portrait. `/kitchen` is laid out landscape, so decide which way the frame hangs and check the layout at that ratio.
- **Burn-in test.** Leave it running for a day on the home Wi-Fi first: it should boot straight into the page with nothing to tap.

## Route options (Android 4.4.2, found 2026-10-11)

None of the doc's Android 6/7 routes apply. On KitKat:

- **System WebView** is Chromium 30 and can't be upgraded.
- **Chrome:** the last version for KitKat is **95**. Sideloadable, but it predates `color-mix()` (111), `oklch()` (111) and cascade layers (99). Tailwind v4.3 wraps its output in `@layer`, so Chrome 95 **drops those rules entirely**. The page comes out unstyled, not just off-colour.
- **Firefox:** the last version for KitKat is **68** (Fennec ESR). Same problems.

So `/kitchen` can't run as-is on this frame. Choices:

1. **Return it.** Recommended. It's advertised as 1080p but renders at 1366×768, so there's a clear case for a return as not as described. Buy something on **Android 9+**, where current Chrome/WebView installs, the app works unchanged, and the chip can handle the page.
2. **Keep it and build a legacy `/kitchen`.** A down-levelled stylesheet and JS bundle for Chrome 95: flatten `@layer`, turn `oklch`/`color-mix` into plain rgb, and check Next 16's client runtime on 95. Then a kiosk in Chrome 95 (root makes boot-to-browser easy). This is real work and a second build to maintain, and an A33 with a Mali-400 will make blur, crossfades and the split-flap animation choppy.
3. **Keep it as a "dumb" screen.** Render `/kitchen` to an image on the server every few minutes and show it full-screen. Cheap, but no taps, panels or ❤️ hearts.

## Plan

1. **Read-only survey** over adb: the facts table above, plus installed packages.
2. **Pick a route** (see "The one hard constraint") and agree it with the owner.
3. **Get a browser** that can render `/kitchen`.
4. **Kiosk setup:** full screen, starts on boot, screen kept on. Night mode in the app already dims it 11pm–6am.
5. **Point it at the live URL:**
   - `https://<project>.vercel.app/kitchen` until the Cloudflare cut-over.
   - Then `https://cottage-view.<subdomain>.workers.dev/kitchen`.
6. **Check on real hardware:**
   - Tap panels, swipes, night mode and the reload-on-deploy.
   - Scrolling and animation speed on the frame's chip.
   - Fix app-side issues on a branch off `feat/cloudflare`.

## Log

_(what was done, in order)_

- **2026-10-10** Installed adb on the laptop (`brew install --cask android-platform-tools`, adb 1.0.41). `adb devices -l` lists **nothing**. The only USB device macOS sees is a WCH/QinHeng CH340 USB-serial adapter (vendor `0x1a86`, "USB Serial", `/dev/cu.wchusbserial210`). That's a serial chip, not an Android USB gadget, so either it's something else plugged in or the frame isn't exposing USB data/ADB yet. Not opened or touched. (Confirmed later: that adapter belongs to another device, not the frame.)
- **2026-10-11** The owner finished the frame's on-screen setup (language, Wi-Fi). Its settings menu (My Frame, Album Settings, Wi-Fi, Factory Data Reset, Help, About) is VPhoto's, not Frameo's, with no ADB toggle.
- **2026-10-11** Scanned the home LAN for open port 5555: only `192.168.0.50` answered. `adb connect 192.168.0.50:5555` connected with **no authorisation prompt**: `model:Classic15_Pro device:Classic15 Pro`.
- **2026-10-11** Read-only survey (`getprop`, `/proc`, `wm`, `df`, `pm list`, `dumpsys`) → facts table above. Pulled a copy of `/system/lib/libwebviewchromium.so` to the laptop to read its version string (Chrome/30.0.0.0), then deleted the copy. **Nothing written to the frame.**
- **2026-10-11** The owner chose **route B: a native Android app**, no browser and no flashing. First a throwaway feasibility spike, keeping the frame returnable.
- **2026-10-11** Laptop toolchain: `brew install openjdk@17`, `brew install --cask android-commandlinetools`, `sdkmanager "platforms;android-34" "build-tools;34.0.0"`. The app is built without Gradle (javac → d8 `--min-api 19` → aapt2 → zipalign → apksigner with a v1 signature, which 4.4 requires), the same way Wes's kiosk app is built.
- **2026-10-11** Spike app `com.cottageview.spike` installed with `adb install` (user app, `/data` only). Results:
  - **Rendering is not a problem.** Hardware-accelerated Canvas at 1366×768: full-screen photo crossfade **59 FPS**; crossfade plus 40 3D-flipping split-flap tiles **56 FPS**; decoding a 1920×1440 JPEG and scaling it to the screen takes about 220–280 ms (do it off the UI thread).
  - **The platform TLS stack fails** for every host we need. KitKat enables only SSLv3/TLS 1.0 by default and has no AES-GCM or ChaCha20 suites. Vercel → `unsupported protocol`, Open-Meteo / Let's Encrypt → `handshake failure`, even with TLS 1.2 forced on. Only Google (which still accepts CBC) worked. Let's Encrypt hosts also fail trust: ISRG Root X1 isn't in the 4.4 store.
  - **Fix that works: bundle Conscrypt 2.5.3** (`org.conscrypt:conscrypt-android`, Maven Central, minSdk 9; adds ~1.3 MB native lib for armeabi-v7a) as the app's TLS provider, with the system CAs (156) plus a bundled ISRG Root X1. Every host then connects over **TLS 1.3 (CHACHA20_POLY1305)**: Vercel (307 → `/unlock`, i.e. the PIN gate, as expected), Open-Meteo 200, Let's Encrypt test site 200, Google 204, workers.dev 301. Vercel and workers.dev chain to GlobalSign Root CA via Google Trust Services, which 4.4 already trusts; only Let's Encrypt hosts need the bundled root.
  - **The stock VPhoto app pulls itself back to the front** about 18 s after another app opens (`com.waophoto.smartframe/.ui.MainActivity`), every time. The real app must stop that: `pm disable` / `pm hide` it (reversible with `pm enable` / `pm unhide`), or become the HOME launcher. Wes saw the same on his frames.
- **2026-10-11** Spike uninstalled (`adb uninstall com.cottageview.spike`). The frame is back to stock.
- **2026-10-11** Plan 2 Task 7: installed the **debug** build of the real app, `com.cottageview.kitchen` (user app in `/data`; HOME-capable but not yet the default). It draws `assets/sample-feed.json` and the screenshot matches the web `/kitchen` layout at 1366×768. **Undo:** `adb uninstall com.cottageview.kitchen`.
- **2026-10-11** With the owner's OK: **disabled the stock VPhoto app** so it stops pulling itself back over the kitchen (`adb shell pm disable com.waophoto.smartframe` from the root adb shell; `/data/system/users/0/package-restrictions.xml` shows `enabled="2"`, so it survives a reboot). Nothing deleted. **Undo:** `adb shell pm enable com.waophoto.smartframe`.
- **2026-10-11** Found while doing that: this frame's `su -c "<cmd>"` runs `<cmd>` as a program path, not a shell line (`su -c 'id -u'` → "exec failed"). The working form is `su 0 sh -c '<cmd>'`. (From `adb shell` you're already root and don't need `su` at all.)
- **2026-10-11** Performance on the frame: a full redraw of the kitchen costs ~57 ms of CPU on the A33, so the app draws each animated section (notice, photo, flap board) as its own view, keeps the static part in a GPU layer, and pre-draws the flap faces. Median frame went from 102 ms to 17 ms (~57 fps).
- **2026-10-11** Plan 2 Task 8: the debug app now runs the live feed. Pushed `files/server.json` (dev base URL `http://192.168.0.10:3100`) and `files/frame_key` (a throwaway dev key, **not** the production `FRAME_KEY`) into `/data/data/com.cottageview.kitchen/files/`, owned by the app's uid, mode 600. (This frame's `chown` has no `-R`.) Verified on the frame: the key-authenticated feed, cache-first restart, offline backoff (5 s, 10 s, …), the "waking up" cold start with no cache, recovery when the server returns, night mode with tap-to-wake, relaunch as HOME after a kill, and HTTPS through Conscrypt to the live Vercel site (got its 307). **Undo:** `adb uninstall com.cottageview.kitchen` removes the app and these files.

## Undo steps

_(how to put the frame back to stock)_

- Only its normal on-screen setup has run (language, Wi-Fi). The spike app was installed and then uninstalled.
- `com.cottageview.kitchen` (debug build) is installed: `adb uninstall com.cottageview.kitchen` removes it and all its files.
- VPhoto is disabled: `adb shell pm enable com.waophoto.smartframe` turns it back on. For a fully clean return: Settings → **Factory Data Reset**.
- Laptop side: `adb disconnect 192.168.0.50:5555`.
- **2026-10-11/12** Self-update and rollback verified on the frame. The app gets root through the frame's own adbd on `127.0.0.1:5555`, because its `su` refuses apps. v1 → v2 installed itself. A deliberately crashing v3 was rolled back to v2 by itself, twice. Once (18:15) the rollback script died before doing anything, and the frame crash-looped on v3 until it was fixed by hand over adb. Since then the app retries an unfinished rollback on every start (at most every 2 minutes) whenever it finds itself on a version it marked bad; this is unit-tested and still to be verified on the frame. Install and rollback scripts now log every step to `/data/local/tmp/kitchen-{install,rollback}.log`. adbd serves one client at a time, so while anyone is connected (laptop adb, Tailscale) the app's root actions wait for the next try.
- **2026-10-12** Night mode moved to midnight–6am (it was 11pm–6am). It always woke by itself at the end of the window; a tap wakes it for 5 minutes. Swiping the photo sideways now goes to the next/previous photo and holds it for a minute (to verify on the frame). The frame went offline around 22:12 on 2026-10-11 (last check-in), cause unknown: it's probably off or on another network, as nothing in the app points to a crash.
- **2026-10-12** The frame came back online. Checked on the frame:
  - **Rollback safety net:** with the crashing v3 installed and "3 is bad" already recorded (the 18:15 stuck state), the first rollback attempt at 09:39 couldn't reach adbd (v3's own install session was still open). The retry at 09:41 uninstalled v3 keeping data, reinstalled v2 and relaunched, with no hands needed.
  - **Swiping:** works.
  - **Tapping a photo:** shows "from … · date" and **✕ Remove**, then "Remove this photo from the frame?" (Yes / No), then "Removed ✓". The photo goes to the /family bin.
  - **Every photo** is now kept and shown. The frame fetches the full list only when the feed's `photosVersion` changes, keeps decoded photos in small LRU caches, and preloads the photos either side so a swipe never shows a blank panel.

- **2026-10-12** Everything on the kitchen is tappable now, like the web `/kitchen`. Verified on the frame with `adb shell input tap` and screenshots:
  - **Weather:** opens the next 18 hours and the week.
  - **A family clock:** opens that place: its time and "good time to call / probably asleep", weather now, the week, plus Santa Cruz's sea & surf (tides, waves, water) and Queenstown's snow.
  - **The flip board:** opens the messages in full.
  - **Closing:** a big ×, a tap outside the panel, 45 s without a touch, or night mode closes it.
  - **On a photo:** **♥ Send a heart** sends a ❤️ reaction on the sender's WhatsApp message (WhatsApp allows it within a day of the photo), then shows "Sent to Kate ✓".
  - **Test setup:** for the test, the demo proxy answered the heart call itself, so no real WhatsApp message was sent. The real send path is covered by the server tests.
- **2026-10-12** Seasonal watercolour skies: 43 new scenes (each sky in each season), so the weather picture follows Ludlow's season.

- **2026-10-12** Production go-live:
  - The site runs on Cloudflare at `https://cottage-view.example.workers.dev`, PIN-gated, with the 36 earlier photos copied to R2. Their senders were lost with the old Upstash database: name them on /family with "Who sent this?".
  - The frame was switched to it with the **release-signed** app and the production `FRAME_KEY`.
- **2026-10-12** Release key: the keystore is `~/.cottage-view/kitchen-release.keystore`, and its password is in the macOS Keychain (service `cottage-view-frame-keystore`). **Back both up**: frames only accept updates signed with this key. Publish with `node scripts/release-frame-app.mjs` after bumping `android/version.properties`.
- **2026-10-12** Updates verified end to end on production, no laptop involved:
  - 4 → 5 self-update.
  - A deliberately crashing 6 was installed, crashed and was rolled back to 5 by the frame in ~5 s. 6 was then never retried.
  - 7 was picked up.
- **2026-10-12** What changed to get there:
  - **Updates** now run `pm install` synchronously in the adb session. Background install scripts had sometimes died before running a line, cause never pinned down, always failing safe.
  - **Rollbacks** are written to a file and started with `busybox setsid` in their own session.
- **2026-10-12** adb lock-down: the app drops TCP 5555 from everything but loopback (`iptables … ! -i lo -j DROP`) at every start and check-in. It still uses adbd over loopback for root (screenshots, logs, installs, all verified with the lock on). **`openadb`** on /kitchen/status lifts the lock for 30 min. A reboot also clears it until the app starts.
- **2026-10-12** App 11 (1.4.0): the **sidebar is hidden** behind a small › tab on the left edge (tap it; it tucks itself away after 10 s), so the kitchen uses the full width. The layout also follows the household's module switches (see below). Picked up via the `update` command in under a minute; screenshot checked.
- **2026-10-12** **Households live** (Phase 2). Production now keeps photos, messages, bin, log, to-dos and settings in **D1** (`cottage-view`) per household; the parents are household `ludlow`. Done in this order so the frame never read an empty database: secrets `SESSION_SECRET` and `ADMIN_PIN` set → schema applied (`wrangler d1 migrations apply cottage-view --remote`) → code deployed with D1 off → `/api/admin/migrate` copied the KV records (36 photos, ids kept) → switched on with the Worker secret `HOUSEHOLDS_STORE=d1`. Three to-dos added at the same instant all landed (on KV one was lost). The TEST reminders and to-dos are removed. **Undo:** `npx wrangler secret delete HOUSEHOLDS_STORE` puts every route back on the KV records at once (left in place; anything changed since then is only in D1).
- **2026-10-12** WhatsApp moved to the new site. Meta app *Cottage View* (Meta's free test number, linked to household ludlow). Worker secrets: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN` (a never-expiring system-user token from Business Suite → System users → *Employee*), `WHATSAPP_APP_SECRET` (the webhook only takes calls signed with it). Webhook: `https://cottage-view.example.workers.dev/api/whatsapp`, field `messages`. Tested end to end with a message and a photo. (Superseded 2026-10-29: Meta deleted the test number; see that entry for the real number.) The old Vercel token could not be recovered (Vercel never returns sensitive values).
- **2026-10-12** Apps 12–20 (all verified on the frame over adb and/or remote screenshots):
  - **12:** full calendar (Month/Week, ‹ › Today, a day in the month opens its week); **+ Add a to-do** with the app's own big keyboard; ride routes open on an OpenStreetMap map (line, start/finish, length, climb); sidebar: no tab, a tap anywhere brings it out.
  - **13–14:** **Settings** on the sidebar: QR code for the family page, its link, and the WhatsApp number. New photos/messages show within ~10 s (a cheap `/api/kitchen/latest` check every 10 s) and a just-arrived photo stays 2 min. Initials agree everywhere ("Sam" → SH when "Sam Hart" is the only full Sam).
  - **15:** the sidebar pushes everything along instead of covering it. Places use four seasons in their own hemisphere (10 new paintings, incl. North Berwick); Kate moved to North Berwick.
  - **16–20:** **the kitchen's own Wi-Fi screen** (Settings → Wi-Fi settings). This frame has **no Back/Home buttons**, so Android's Wi-Fi settings were a dead end (16 used them — someone got stuck). Now: list of networks, tap one, big keyboard with capitals/numbers/symbols, Connect. A failed join is undone and the frame goes back to the network it was on (verified with a wrong password); a network it has joined before needs one tap; other saved networks stay enabled so it falls back by itself. If anything else ever takes the screen, the kitchen comes back after 3 min. Remote **"show me a panel"** on /kitchen/status (verified: rides).
- **2026-10-12** Preloaded the parents' Wi-Fi: 16 combinations of the name and password the parents gave (four capitalisations each), written straight into `/data/misc/wifi/wpa_supplicant.conf` (Android's own save keeps one password per name). Backup of the file before: `/data/local/tmp/wpa_backup.conf` on the frame. **Undo:** restore that file (`cat … > /data/misc/wifi/wpa_supplicant.conf`, chown system:wifi, chmod 660) and toggle Wi-Fi. Whether all 16 survive a reboot was being checked when the frame went quiet (unplugged for packing?); if the name turns out to be different, the parents join from Settings → Wi-Fi settings.
- **2026-10-12** Power for England: the frame's adapter is 12 V ⎓ 1.5 A, barrel plug, input 100–240 V. Shipping with a UK-plug 12 V 2 A supply (YOCXAOG, interchangeable tips): fit the right tip and the UK head before packing.
- **2026-10-29** The frame arrived. Meta deleted the test WhatsApp account on 2026-10-28 (`account_update` → `ACCOUNT_DELETED`), so the test number shows as "no longer on WhatsApp". Moved to a **real number: +1 555-010-0199** (placeholder), a free Google Voice number on the owner's Google account (calls forward to the owner's mobile). **Google reclaims numbers unused for ~3 months: make a call or send a text from it now and then.** Meta: WhatsApp account `<whatsapp account id>` (owns the number) → messaging account `<WABA id>` (the API's WABA, business verified) → phone number id `<phone number id>` (Cloud API, display name *Cottage View* approved). The *Employee* system user has full access to the WhatsApp account; the app is subscribed to the messaging account (`POST <WABA id>/subscribed_apps`). `WHATSAPP_PHONE_NUMBER_ID` and household ludlow (`household.mjs set-whatsapp`) both point at the new id; the frame's Settings shows the new number. Anyone can message it — no recipient list.
  - **Verified:** Peter's and the owner's test photos arrived (14:17–14:18 UTC); a remote `show-settings` screenshot shows "+1 555-010-0199" on the frame. The QR code is unchanged: it links to `/family`, not to WhatsApp.
  - **Group chats:** a Cloud API number can't be added to an ordinary WhatsApp group. Family members forward a photo from a group to *Cottage View* instead (long-press → Forward). Meta's Groups API (the business number creates its own group and invites by link) might allow a "Cottage View" family group, but eligibility is unchecked and the webhook only handles one-to-one messages today.
  - Hearts (❤️ from the frame) on the new number are untested. If they fail, give the *Employee* system user access to messaging account `<WABA id>` too.

## Remote help from abroad

Everything goes through the website; the frame only ever calls out (no ports, no Tailscale — it doesn't run on Android 4.4).

- **`/kitchen/status`** (PIN): last seen, version, Wi-Fi strength, errors; buttons **reload / update / screenshot / logs / restart / openadb**, and **Show me a panel** (weather, calendar, todo, rides, messages, settings, wifi: opens it, screenshots it, closes it). Requests are collected at the frame's **10-minute check-in**; only one waits at a time (a new one replaces it).
- **App updates:** bump `android/version.properties`, `node scripts/release-frame-app.mjs`; the frame installs it within a day, or at the next check-in after **update**; a version that keeps crashing is rolled back by the frame.
- **Needs someone there:** a new router or password (Settings → Wi-Fi settings on the frame), power. `openadb` only helps on the frame's own Wi-Fi.

## Households (more frames)

Each household has its own frame(s), photos, messages, to-dos, settings, places, modules, family-page PIN and WhatsApp number.

- **Who is who:** a frame's key → its household (`frames` table; the parents' original `FRAME_KEY` is ludlow). On `/family`, each household's PIN signs that household in (signed cookie `cv_h`); the parents' original PIN still works. **The owner** signs in with the admin PIN (Keychain: `security find-generic-password -s cottage-view-admin-pin -w | pbcopy`).
- **New household:** `node scripts/household.mjs new sister "Kate's" "Edinburgh" --who Kate` creates it with its home, generates its PIN and frame key straight into the Keychain (`cottage-view-<id>-pin`, `cottage-view-<id>-frame-key`, never printed). Then `scripts/provision-frame.sh <frame ip> sister` sets up the frame over adb (installs the app, writes the server address and key, disables VPhoto, starts it; then press Home → Kitchen → Always). Also: `list`, `reset-pin`, `add-frame`, `set-whatsapp <id> <phone number id>`.
- **WhatsApp:** one Meta app and webhook; each message goes to the household that owns the receiving number (`metadata.phone_number_id`). The parents' number (`WHATSAPP_PHONE_NUMBER_ID`) is ludlow. Hearts go out from the household's own number and are only offered where it has one. New households' photos are stored under `h/<id>/` in R2, and `/api/photo` serves each household only its own.
- **Modules:** `/family` → Settings → *On the frame* switches clocks, Happening today, to-do, rides & walks, the message board and photos on or off; the frame's layout fills the space. *Family clocks* adds a place by name (Open-Meteo geocoding) with who's there, or removes one. Places without a painting show their weather's sky.

## Server side for the frame app

- **`FRAME_KEY` secret:** the frame's own key. Generate and set it without it ever being printed:
  `openssl rand -base64 32 | tr -d '\n' | npx wrangler secret put FRAME_KEY`
  For local dev, add `FRAME_KEY=...` to `.dev.vars` (git-ignored).
  To revoke: set a new one, then push the new key to the frame over Tailscale/adb (Plan 3).
- **Endpoints (frame key)** — every one checks the key and works on its own household (`lib/kitchen/frameKey.ts` lists them; a test walks them all): `/api/kitchen/feed` (+ `share`: family-page link, QR rows, WhatsApp number; `latest` marker), `/api/kitchen/latest` (the 10 s "anything new?"), `/api/kitchen/checkin`, `/api/kitchen/upload`, `/api/kitchen/release`, `/api/kitchen/release/apk`, `/api/photo`, `/api/kitchen/photos`, `/api/kitchen/photos/remove`, `/api/kitchen/photos/love`, `/api/kitchen/panels`, `/api/kitchen/todos/toggle`, `/api/kitchen/todos/add`, `/api/kitchen/calendar?from=&days=` (≤ 42), `/api/kitchen/route?id=` (BRouter line, kept in R2), `/api/kitchen/tile?z=&x=&y=` (OpenStreetMap tiles, kept in R2).
- **Hearts** need `WHATSAPP_TOKEN` and the household's number (`WHATSAPP_PHONE_NUMBER_ID` for the parents). Without them, photos report no heart window and the frame shows no heart button.
- **The owner:** `/kitchen/status` — see *Remote help from abroad* above.

## The family site (`/family`)

The owner's parents look after the frame from **`/family`** on any phone or computer. It's behind the same PIN as the rest of the site, and linked from the home page.

- **Photos:** every photo (all are kept now, shown 60 at a time) with who sent it and when. Photos can also be removed on the frame itself: tap the photo, then **✕ Remove**. *Hide from frame* keeps it listed but off the frame; *Hold to delete* moves it to the **Bin** (with an Undo for 10 s). The bin keeps things 30 days, then deletes the photo itself from R2.
- **Messages:** what's on the flip board now (hold to remove), and *Who sent what*: a log of every photo and message (newest 500), which outlives the board's 24 hours and the 40-photo cap.
- **Calendars:** paste a Google "Secret address in iCal format" or an Apple "Public Calendar" `webcal://` link, press *Check it* (shows what's coming up, or a plain reason it failed), pick a colour, add. Today's and tomorrow's events then show in the frame's corner card ("Today 2:30pm — Dentist") under the calendar's name, in its colour. A broken calendar only costs its own cards. Step-by-step guides for both are on the page.
- **Settings:** night hours, how long each photo stays, how photos fit, what's on the frame (modules), the family clocks (**Move** someone: find the new town, same person; a town we've painted gets its painting), and the birthdays/anniversaries the frame counts down to.
- **To-do and Reminders:** the same to-do list as the frame (ticked items stay crossed out for 24 h, then go); reminders like bin day or tennis show in Happening today and the calendar.
- **Who sent this?** Photos without a sender (the 36 moved from Vercel) show one-tap family-name buttons, so their initials appear on the frame.

Where it lives: **D1** (`cottage-view`), one household per row in `households`, with `photos`, `notes`, `todos` and `log` scoped to it (before 2026-10-12: Workers KV `family:settings`, `frame:*`, `family:todos`, kept as the fallback). Every change is one SQL statement, so two people editing at once can't lose each other's changes. Settings are sanitized when saved *and* when read, so a bad record falls back to the defaults in `lib/config.ts`; nothing saved there can break the frame. The frame picks changes up at its next feed poll, with no app update. Code: `lib/family/`, `app/family/`, `app/api/family/`.

