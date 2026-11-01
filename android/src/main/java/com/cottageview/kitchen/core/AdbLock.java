package com.cottageview.kitchen.core;

/**
 * Lock-down for the frame's adbd, which listens on every interface as root with
 * no auth. The app needs it — but only over loopback (app/Root) — so anything
 * arriving on 5555 from elsewhere (the home Wi-Fi) is dropped. iptables rules
 * don't survive a reboot, so the app closes it again at every start; the
 * `openadb` remote command lifts it for OPEN_MS.
 */
public final class AdbLock {
    private AdbLock() {}

    static final String RULE = "INPUT -p tcp --dport 5555 ! -i lo -j DROP";
    /** Add the rule unless it's already there. */
    public static final String CLOSE = "iptables -C " + RULE + " 2>/dev/null || iptables -I " + RULE;
    /** Remove every copy of it. */
    public static final String OPEN = "while iptables -D " + RULE + " 2>/dev/null; do :; done";
    public static final long OPEN_MS = 30 * 60_000L;
}
