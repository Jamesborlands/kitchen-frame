#!/bin/bash
# Runs the pure-Java core's JUnit tests on the laptop JVM. Also enforces that
# core/ never imports android.* (it must run here, not only on the device).
set -euo pipefail
cd "$(dirname "$0")"
export JAVA_HOME=${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}
export PATH="$JAVA_HOME/bin:$PATH"
[ -f libs/jvm/junit.jar ] || ./fetch-libs.sh
CORE=src/main/java/com/cottageview/kitchen/core
if grep -rn "^import android\." "$CORE"; then echo "core/ must not import android.*" >&2; exit 1; fi
CP="libs/jvm/junit.jar:libs/jvm/hamcrest-core.jar:libs/jvm/json.jar"
OUT=build/jvmtest
rm -rf "$OUT" && mkdir -p "$OUT"
javac --release 8 -nowarn -encoding UTF-8 -classpath "$CP" -d "$OUT" \
  $(find "$CORE" src/test/java -name '*.java')
CLASSES=$(cd src/test/java && find . -name '*Test.java' | sed 's|^\./||; s|\.java$||; s|/|.|g')
java -cp "$OUT:$CP" org.junit.runner.JUnitCore $CLASSES
