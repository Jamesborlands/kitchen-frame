package com.cottageview.kitchen.core;

/**
 * Shell lines for running a script that must outlive the app (a rollback
 * uninstalls the app mid-script). The script goes to a file via a quoted
 * heredoc (no escaping), then starts in its own session with busybox setsid, so
 * nothing aimed at the adb shell that launched it — a hangup, a process-group
 * kill — can reach it. Without busybox it falls back to ignoring SIGHUP.
 */
public final class Detached {
    private Detached() {}

    static final String EOF = "KITCHEN_EOF";

    public static String writeScript(String path, String body) {
        for (String line : body.split("\n")) {
            if (line.trim().equals(EOF)) throw new IllegalArgumentException("script contains the heredoc delimiter");
        }
        return "cat > " + path + " <<'" + EOF + "'\n" + body + "\n" + EOF + "\nchmod 700 " + path;
    }

    public static String launch(String path, String log) {
        return "( if [ -x /system/bin/busybox ]; then exec /system/bin/busybox setsid sh " + path
            + "; else trap '' HUP; exec sh " + path + "; fi ) </dev/null > " + log + " 2>&1 &";
    }
}
