#!/usr/bin/env bash
# Set up a new kitchen frame for a household over adb (Android 4.4 frames with a
# root adb shell, like the VPhoto 15.6"). Reversible: see docs/kitchen-frame.md.
#
#   scripts/provision-frame.sh <frame ip> <household id>
#
# Installs the release app (downloaded with the household's frame key), writes
# the server address and the key into the app's private files, disables the
# stock VPhoto slideshow (not removed: `pm enable com.waophoto.smartframe` undoes it)
# and starts the app. The frame key comes from the Keychain and is never printed.
set -euo pipefail
IP="${1:?frame ip}"; ID="${2:?household id}"
BASE="${COTTAGE_VIEW_URL:-https://cottage-view.example.workers.dev}"
PKG=com.cottageview.kitchen
F="$IP:5555"

KEY="$(security find-generic-password -s "cottage-view-$ID-frame-key" -w)" || { echo "no frame key for $ID in the Keychain (household.mjs new/add-frame)"; exit 1; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
umask 077

echo "→ downloading the app"
curl -fsS -A curl/8 -H "Authorization: Bearer $KEY" "$BASE/api/kitchen/release/apk" -o "$TMP/kitchen.apk"

echo "→ connecting to $F"
adb connect "$F" | tail -1
adb -s "$F" wait-for-device

echo "→ backing up the vendor app list (for the record)"
adb -s "$F" shell pm list packages -s > "$TMP/packages.txt"
mkdir -p "docs/frames"; cp "$TMP/packages.txt" "docs/frames/$ID-system-packages.txt"

echo "→ installing"
adb -s "$F" install -r "$TMP/kitchen.apk" | tail -1

echo "→ server address and key"
printf '{"baseUrl":"%s"}' "$BASE" > "$TMP/server.json"
printf '%s' "$KEY" > "$TMP/frame_key"
APPUID="$(adb -s "$F" shell "dumpsys package $PKG" | tr -d '\r' | sed -n 's/.*userId=\([0-9]*\).*/\1/p' | head -1)"
DIR="/data/data/$PKG/files"
adb -s "$F" shell "mkdir -p $DIR && chown $APPUID:$APPUID $DIR && chmod 700 $DIR"
for f in server.json frame_key; do
  adb -s "$F" push "$TMP/$f" "/data/local/tmp/$f" >/dev/null
  adb -s "$F" shell "cat /data/local/tmp/$f > $DIR/$f && rm /data/local/tmp/$f && chown $APPUID:$APPUID $DIR/$f && chmod 600 $DIR/$f"
done

echo "→ stopping the stock slideshow (disabled, not removed)"
adb -s "$F" shell pm disable com.waophoto.smartframe >/dev/null 2>&1 || echo "  (no VPhoto app on this frame)"

echo "→ starting the kitchen"
adb -s "$F" shell am start -n "$PKG/.app.KitchenActivity" | tail -1
echo "done. On the frame: press Home once and choose Kitchen → Always."
