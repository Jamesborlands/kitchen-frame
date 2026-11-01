package com.cottageview.kitchen.app;

import android.util.Log;
import java.io.File;

/** Remote commands from /kitchen/status, delivered by the check-in. Runs off the UI thread. */
public final class CommandRunner {
    static final String TAG = "Kitchen";
    private final Controller c;
    private final Updater updater;

    public CommandRunner(Controller c, Updater updater) { this.c = c; this.updater = updater; }

    private void screenshot() throws Exception {
        File f = new File("/data/local/tmp/kitchen-shot.png");
        Root.Result r = Root.run("screencap -p " + f.getPath() + " && chmod 644 " + f.getPath(), 20_000);
        byte[] png = readAll(f);
        Root.run("rm " + f.getPath(), 5_000);
        if (png == null) {
            // surfaces on /kitchen/status via the next check-in's lastError
            c.lastError = "screenshot failed: exit " + r.exit + " " + r.out.trim();
            Log.w(TAG, c.lastError);
            return;
        }
        c.net().post("/api/kitchen/upload?kind=screenshot", png, "image/png");
    }

    public void run(String command) {
        if (command == null) return;
        Log.i(TAG, "command: " + command);
        try {
            switch (command) {
                case "reload":
                    c.ui.post(new Runnable() { @Override public void run() { c.mem.clear(); c.blurs.clear(); c.pollNow(); } });
                    break;
                case "update":
                    updater.checkAndInstall();
                    break;
                case "screenshot":
                    screenshot();
                    break;
                case "logs": {
                    // the app's own lines first (vendor services spam the shared log every few seconds), then the rest
                    Root.Result r = Root.run("echo '== Kitchen =='; logcat -d -v time -s Kitchen:* | tail -n 400 2>/dev/null || logcat -d -v time -s Kitchen:*;"
                        + " echo '== everything (latest) =='; logcat -d -v time -t 1500", 30_000);
                    c.net().post("/api/kitchen/upload?kind=logs", r.out.getBytes("UTF-8"), "text/plain; charset=utf-8");
                    break;
                }
                case "openadb": {
                    // someone needs a shell (on the frame's Wi-Fi, or over Tailscale): open for half an hour
                    c.adbOpenUntil = System.currentTimeMillis() + com.cottageview.kitchen.core.AdbLock.OPEN_MS;
                    Root.Result r = Root.run(com.cottageview.kitchen.core.AdbLock.OPEN, 10_000);
                    Log.i(TAG, "adb open for 30 min (exit " + r.exit + ")");
                    c.ui.postDelayed(new Runnable() { @Override public void run() { c.closeAdb(); } }, com.cottageview.kitchen.core.AdbLock.OPEN_MS);
                    break;
                }
                case "restart":
                    KitchenApp.restartSoon(c.activity, 2000);
                    android.os.Process.killProcess(android.os.Process.myPid());
                    break;
                default: {
                    final String panel = com.cottageview.kitchen.core.RemoteShow.panel(command);
                    if (panel == null) { Log.w(TAG, "unknown command " + command); break; }
                    // open it as if tapped, let it load, screenshot it, close it again
                    c.ui.post(new Runnable() { @Override public void run() { c.view.showPanel(panel); } });
                    Thread.sleep(com.cottageview.kitchen.core.RemoteShow.SETTLE_MS);
                    screenshot();
                    c.ui.post(new Runnable() { @Override public void run() { c.view.hidePanel(); } });
                    break;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "command " + command + " failed", e);
        }
    }

    static byte[] readAll(File f) {
        try (java.io.InputStream in = new java.io.FileInputStream(f)) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        } catch (Exception e) { return null; }
    }
}
