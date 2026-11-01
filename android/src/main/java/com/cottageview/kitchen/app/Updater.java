package com.cottageview.kitchen.app;

import android.content.Context;
import android.content.pm.PackageManager;
import android.util.Log;
import com.cottageview.kitchen.core.CrashLog;
import com.cottageview.kitchen.core.PendingUpdate;
import com.cottageview.kitchen.core.UpdatePolicy;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import org.json.JSONObject;

/**
 * Self-update: fetch release.json, download the APK, verify size + sha256,
 * keep a copy of the running APK, then `pm install -r` as root via the frame's own adbd (Android also
 * enforces the same signing key). At the next start, guardOnStart rolls back a
 * version that crashes 3 times within 10 minutes.
 */
public final class Updater {
    static final String TAG = "Kitchen";
    private final Context ctx;
    private final Net net;

    public Updater(Context ctx, Net net) { this.ctx = ctx; this.net = net; }

    private volatile int lastTriedVersion = -1;
    /** Why the last update didn't install, for the check-in (cleared on start, i.e. after a successful one). */
    public volatile String lastFailure;
    private volatile long lastTriedAt;

    /** Cheap pre-check for the feed's latestVersionCode (see UpdatePolicy.shouldAttempt). */
    public boolean wantsToTry(int latest) {
        return UpdatePolicy.shouldAttempt(currentVersion(), latest, lastTriedVersion, lastTriedAt, System.currentTimeMillis(), badVersion(ctx));
    }

    static File pendingFile(Context c) { return new File(c.getFilesDir(), "pending-update.json"); }
    static File previousApk(Context c) { return new File(c.getFilesDir(), "previous.apk"); }
    /** The version we rolled back from. App data survives the rollback's `pm uninstall -k`, so this sticks. */
    static File badVersionFile(Context c) { return new File(c.getFilesDir(), "bad-version"); }

    static int badVersion(Context c) {
        try {
            String s = com.cottageview.kitchen.core.ServerConfig.readUtf8(badVersionFile(c));
            return s == null ? -1 : Integer.parseInt(s.trim());
        } catch (Exception e) { return -1; }
    }

    public int currentVersion() {
        try { return ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0).versionCode; }
        catch (PackageManager.NameNotFoundException e) { return -1; }
    }

    /** Blocking — call off the UI thread. */
    public void checkAndInstall() {
        try {
            JSONObject rel = new JSONObject(new String(net.get("/api/kitchen/release"), "UTF-8"));
            int latest = rel.getInt("versionCode");
            int current = currentVersion();
            if (!UpdatePolicy.shouldAttempt(current, latest, lastTriedVersion, lastTriedAt, System.currentTimeMillis(), badVersion(ctx))) return;
            // adbd serves one client at a time: if someone's connected (e.g. over Tailscale), wait for the next poll
            if (Root.run("echo ok", 3_000).exit != 0) {
                Log.i(TAG, "update " + latest + " waiting — adbd is busy");
                return;
            }
            lastTriedVersion = latest;
            lastTriedAt = System.currentTimeMillis();
            File apk = new File(ctx.getFilesDir(), "update.apk");
            try (OutputStream o = new FileOutputStream(apk)) { o.write(net.get("/api/kitchen/release/apk")); }
            if (!UpdatePolicy.verify(apk, rel.getString("sha256"), rel.getLong("sizeBytes"))) {
                Log.w(TAG, "update " + latest + " failed verification — not installing");
                apk.delete();
                return;
            }
            copy(new File(ctx.getApplicationInfo().sourceDir), previousApk(ctx));
            new PendingUpdate(current, latest, System.currentTimeMillis()).save(pendingFile(ctx));
            // files/ is private (700) — the system installer can't read it there, so root stages a readable copy.
            // Synchronous, not a background script (those sometimes died before running — see the log in
            // docs/kitchen-frame.md): a successful install restarts this app while the system commits it, so
            // getting past this call means it didn't install, and pm's own words say why.
            Root.Result r = Root.run("cp '" + apk.getAbsolutePath() + "' " + STAGED + " && chmod 644 " + STAGED
                + " && pm install -r " + STAGED + "; echo pm-exit=$?; rm -f " + STAGED, 180_000);
            if (r.exit == -1 && !r.out.contains("pm-exit=")) {
                Log.w(TAG, "update " + latest + " could not run: " + r.out.trim());
                PendingUpdate.clear(pendingFile(ctx));
                lastTriedVersion = -1; // not a real attempt — try again at the next poll
                return;
            }
            lastFailure = "update to " + latest + " did not install: " + r.out.trim().replace('\n', ' ');
            Log.w(TAG, lastFailure);
            PendingUpdate.clear(pendingFile(ctx));
        } catch (Exception e) {
            Log.w(TAG, "update check failed", e);
        }
    }

    /**
     * Run first thing in onCreate. Rollback talks to adbd, which can't happen on the UI
     * thread — so it runs on a helper thread, but onCreate waits for it: a version that
     * crashes early would otherwise kill the process before the rollback is sent.
     */
    public static void guardOnStart(final Context c) {
        Thread t = new Thread(new Runnable() { @Override public void run() { guard(c); } }, "update-guard");
        t.start();
        try { t.join(10_000); } catch (InterruptedException ignored) { /* carry on */ }
    }

    static void guard(Context c) {
        PendingUpdate pending = PendingUpdate.load(pendingFile(c));
        int current;
        try { current = c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionCode; }
        catch (PackageManager.NameNotFoundException e) { return; }
        CrashLog log = new CrashLog(new File(c.getFilesDir(), "crashes.log"));
        switch (UpdatePolicy.decideOnStart(current, pending, log.all(), System.currentTimeMillis())) {
            case CLEAR:
                PendingUpdate.clear(pendingFile(c));
                break;
            case ROLLBACK:
                PendingUpdate.clear(pendingFile(c)); // clear first: never loop
                try (java.io.FileOutputStream o = new java.io.FileOutputStream(badVersionFile(c))) {
                    o.write(String.valueOf(current).getBytes("UTF-8")); // don't reinstall this version after the rollback
                } catch (IOException e) {
                    Log.w(TAG, "couldn't record bad version " + current, e);
                }
                launchRollback(c, current);
                break;
            default:
                // a rollback that didn't finish leaves us on the bad version: try again (throttled)
                if (UpdatePolicy.shouldRetryRollback(current, badVersion(c), lastRollbackAt(c), System.currentTimeMillis())) {
                    launchRollback(c, current);
                }
                break;
        }
    }

    static File rollbackAtFile(Context c) { return new File(c.getFilesDir(), "rollback-at"); }

    static long lastRollbackAt(Context c) {
        try {
            String s = com.cottageview.kitchen.core.ServerConfig.readUtf8(rollbackAtFile(c));
            return s == null ? 0 : Long.parseLong(s.trim());
        } catch (Exception e) { return 0; }
    }

    private static void launchRollback(Context c, int current) {
        File prev = previousApk(c);
        if (!prev.exists()) { Log.w(TAG, "can't roll back " + current + ": no previous.apk"); return; }
        try (FileOutputStream o = new FileOutputStream(rollbackAtFile(c))) {
            o.write(String.valueOf(System.currentTimeMillis()).getBytes("UTF-8"));
        } catch (IOException e) {
            Log.w(TAG, "couldn't record rollback time", e);
        }
        Log.w(TAG, "rolling back " + current + " → previous.apk");
        Root.Result r = Root.detached(rollbackScript(prev.getAbsolutePath(), c.getPackageName()), ROLLBACK_LOG);
        Log.w(TAG, "rollback launch exit=" + r.exit + " " + r.out.trim());
    }

    static final String STAGED = "/data/local/tmp/kitchen-update.apk";
    static final String STAGED_PREV = "/data/local/tmp/kitchen-previous.apk";

    /**
     * KitKat's pm has no -d (allow downgrade). Try a plain reinstall of the previous
     * APK first; if the downgrade is refused, uninstall keeping data (-k: the key and
     * config in files/ survive) and install it fresh. Runs detached as root, because
     * the uninstall kills this process, and relaunches the kitchen at the end.
     */
    static final String INSTALL_LOG = "/data/local/tmp/kitchen-install.log";
    static final String ROLLBACK_LOG = "/data/local/tmp/kitchen-rollback.log";

    static String rollbackScript(String prevApk, String pkg) {
        String out = STAGED_PREV + ".out";
        return "echo started; cp '" + prevApk + "' " + STAGED_PREV + " && chmod 644 " + STAGED_PREV + " && echo staged"
            + " && { pm install -r " + STAGED_PREV + " > " + out + " 2>&1; cat " + out + "; grep -q Success " + out
            + " || { echo uninstalling; pm uninstall -k " + pkg + " && pm install -r " + STAGED_PREV + "; echo pm-exit=$?; }; }"
            + "; rm -f " + STAGED_PREV + " " + out
            + "; am start -n " + pkg + "/.app.KitchenActivity; echo done";
    }

    static void copy(File from, File to) throws IOException {
        try (InputStream in = new FileInputStream(from); OutputStream out = new FileOutputStream(to)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
    }
}
