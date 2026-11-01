package com.cottageview.kitchen.app;

import com.cottageview.kitchen.core.AdbShell;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * Runs a shell command as root by talking ADB to the frame's own adbd on
 * localhost:5555 (root, no auth). This frame's su refuses apps — it only allows
 * root and shell — so this is the app's only way to screenshot, read logs and
 * install updates. Never throws; times out. Call off the UI thread.
 */
public final class Root {
    public static final class Result {
        public final int exit;
        public final String out;
        Result(int exit, String out) { this.exit = exit; this.out = out; }
    }

    private Root() {}

    public static Result run(String cmd, long timeoutMs) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress("127.0.0.1", 5555), 3000);
            s.setSoTimeout((int) Math.min(Integer.MAX_VALUE, timeoutMs));
            AdbShell.Exit e = AdbShell.parseExit(AdbShell.session(s.getInputStream(), s.getOutputStream(), AdbShell.withExit(cmd)));
            return new Result(e.code, e.out);
        } catch (Exception e) {
            return new Result(-1, String.valueOf(e));
        }
    }

    /**
     * Start a script that must outlive this process (a rollback uninstalls the app,
     * which closes the adb session): written to a file next to its log, then run in
     * its own session (core/Detached). Logs to logFile.
     */
    public static Result detached(String script, String logFile) {
        String path = logFile.replaceAll("\\.log$", "") + ".sh";
        return run(com.cottageview.kitchen.core.Detached.writeScript(path, script) + "\n"
            + com.cottageview.kitchen.core.Detached.launch(path, logFile), 10_000);
    }
}
