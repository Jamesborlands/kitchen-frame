#!/bin/bash
# Downloads the app's third-party binaries (never committed) and checks them:
# Maven artifacts against Maven Central's .sha1, everything against the pinned
# sha256 in third_party.lock. `./fetch-libs.sh --pin` (re)writes the lock — only
# do that deliberately, after reviewing what changed.
set -euo pipefail
cd "$(dirname "$0")"
PIN=${1:-}
mkdir -p libs/jvm libs/conscrypt assets/fonts
M=https://repo1.maven.org/maven2
LOCK=third_party.lock
NEW_LOCK=$(mktemp)

check_lock() { # name file
  local sum; sum=$(shasum -a 256 "$2" | cut -d' ' -f1)
  echo "$1 $sum" >> "$NEW_LOCK"
  if [ "$PIN" != "--pin" ]; then
    grep -qx "$1 $sum" "$LOCK" || { echo "sha256 mismatch for $1 ($2): $sum not in $LOCK" >&2; exit 1; }
  fi
}

maven() { # groupPath artifact version ext dest
  local url="$M/$1/$2/$3/$2-$3.$4"
  [ -f "$5" ] || curl -fsSL -o "$5" "$url"
  local want; want=$(curl -fsSL "$url.sha1" | cut -c1-40)
  local got; got=$(shasum -a 1 "$5" | cut -d' ' -f1)
  [ "$want" = "$got" ] || { echo "sha1 mismatch for $url" >&2; rm -f "$5"; exit 1; }
  check_lock "$2-$3.$4" "$5"
}

maven junit junit 4.13.2 jar libs/jvm/junit.jar
maven org/hamcrest hamcrest-core 1.3 jar libs/jvm/hamcrest-core.jar
maven org/json json 20231013 jar libs/jvm/json.jar
maven org/conscrypt conscrypt-android 2.5.3 aar libs/conscrypt/conscrypt.aar
(cd libs/conscrypt && rm -rf aar && mkdir aar && unzip -q conscrypt.aar -d aar)
cp libs/conscrypt/aar/classes.jar libs/conscrypt/conscrypt.jar
mkdir -p libs/conscrypt/native/lib/armeabi-v7a
cp libs/conscrypt/aar/jni/armeabi-v7a/libconscrypt_jni.so libs/conscrypt/native/lib/armeabi-v7a/

# Static TTFs from Google Fonts (OFL). An old user agent makes the CSS API serve TTF,
# which Android 4.4 can load (it can't do WOFF2 or variable fonts).
CSS=$(curl -fsSL -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Inter:wght@300;400")
fetch_font() { # family weight dest
  local url; url=$(echo "$CSS" | awk -v fam="$1" -v w="$2" '
    /font-family/ { f = index($0, fam) > 0 }
    /font-weight/ { wt = ($2 == w";") }
    /src:/ { if (f && wt) { match($0, /url\([^)]*\)/); print substr($0, RSTART+4, RLENGTH-5); exit } }')
  [ -n "$url" ] || { echo "no TTF url for $1 $2" >&2; exit 1; }
  [ -f "$3" ] || curl -fsSL -o "$3" "$url"
  check_lock "$(basename "$3")" "$3"
}
fetch_font "Cormorant Garamond" 400 assets/fonts/CormorantGaramond-Regular.ttf
fetch_font "Cormorant Garamond" 500 assets/fonts/CormorantGaramond-Medium.ttf
fetch_font "Inter" 300 assets/fonts/Inter-Light.ttf
fetch_font "Inter" 400 assets/fonts/Inter-Regular.ttf

if [ "$PIN" = "--pin" ]; then sort "$NEW_LOCK" > "$LOCK"; echo "pinned $(wc -l < "$LOCK") files in $LOCK"; fi
rm -f "$NEW_LOCK"
echo "third-party libs OK"
