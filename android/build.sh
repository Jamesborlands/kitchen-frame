#!/bin/bash
# Builds the kitchen app without Gradle: javac -> d8 -> aapt2 -> zipalign -> apksigner.
#   ./build.sh            debug, signed with android/.debug.keystore (generated, git-ignored)
#   ./build.sh release    release, needs FRAME_KEYSTORE, FRAME_KEYSTORE_PASS [, FRAME_KEY_ALIAS]
set -euo pipefail
cd "$(dirname "$0")"
VARIANT=${1:-debug}
export JAVA_HOME=${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}
export PATH="$JAVA_HOME/bin:$PATH"
SDK=${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}
BT=$SDK/build-tools/34.0.0
JAR=$SDK/platforms/android-34/android.jar
[ -f libs/conscrypt/conscrypt.jar ] || ./fetch-libs.sh

prop() { grep -E "^$1=" version.properties | cut -d= -f2 | tr -d '[:space:]'; }
versionCode=$(prop versionCode)
versionName=$(prop versionName)

OUT=build/$VARIANT
rm -rf "$OUT" && mkdir -p "$OUT/classes" "$OUT/dex"
javac --release 8 -nowarn -Xlint:-options -encoding UTF-8 \
  -classpath "$JAR:libs/conscrypt/conscrypt.jar" -d "$OUT/classes" \
  $(find src/main/java -name '*.java')
$BT/d8 --min-api 19 --release --lib "$JAR" --output "$OUT/dex" \
  $(find "$OUT/classes" -name '*.class') libs/conscrypt/conscrypt.jar 2> >(grep -v -E 'KitKatPlatformOpenSSLSocketImplAdapter|PreKitKatPlatformOpenSSLSocketImplAdapter|desugaring' >&2)
$BT/aapt2 link -o "$OUT/base.apk" -I "$JAR" --manifest AndroidManifest.xml \
  --min-sdk-version 19 --target-sdk-version 19 \
  --version-code "$versionCode" --version-name "$versionName" -A assets
(cd "$OUT/dex" && zip -q ../base.apk classes.dex)
(cd libs/conscrypt/native && zip -q -r -0 "../../../$OUT/base.apk" lib)
$BT/zipalign -f -p 4 "$OUT/base.apk" "$OUT/aligned.apk"

if [ "$VARIANT" = release ]; then
  : "${FRAME_KEYSTORE:?set FRAME_KEYSTORE to the release keystore path}"
  : "${FRAME_KEYSTORE_PASS:?set FRAME_KEYSTORE_PASS}"
  KS=$FRAME_KEYSTORE; PASS=$FRAME_KEYSTORE_PASS; ALIAS=${FRAME_KEY_ALIAS:-kitchen}
else
  KS=.debug.keystore; PASS=android; ALIAS=debug
  [ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -storepass "$PASS" -keypass "$PASS" -alias "$ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=cottage-view debug" >/dev/null 2>&1
fi
$BT/apksigner sign --ks "$KS" --ks-pass "pass:$PASS" --ks-key-alias "$ALIAS" --min-sdk-version 19 \
  --out "build/kitchen-$VARIANT.apk" "$OUT/aligned.apk"
$BT/apksigner verify --min-sdk-version 19 "build/kitchen-$VARIANT.apk"
echo "$(pwd)/build/kitchen-$VARIANT.apk"
