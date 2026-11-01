package com.cottageview.kitchen.core;

import java.io.File;
import java.util.List;

/** The self-update rules: only newer, only verified, and roll back a version that keeps crashing. */
public final class UpdatePolicy {
    private UpdatePolicy() {}

    public static final long WATCH_MS = 10 * 60_000L;
    public static final int MAX_CRASHES = 3;

    public enum Decision { NONE, KEEP_WATCHING, CLEAR, ROLLBACK }

    public static boolean shouldDownload(int current, int latest) { return latest > current; }

    public static final long RETRY_SAME_VERSION_MS = 30 * 60_000L;

    /**
     * Should we try to install `latest` now? A version we haven't tried yet: straight away.
     * The same version again (its last try failed): at most every half hour.
     */
    public static boolean shouldAttempt(int current, int latest, int lastTriedVersion, long lastTriedAt, long now) {
        return shouldAttempt(current, latest, lastTriedVersion, lastTriedAt, now, -1);
    }

    /** As above, and never `badVersion` — one that crashed and was rolled back (retrying it would loop). */
    public static boolean shouldAttempt(int current, int latest, int lastTriedVersion, long lastTriedAt, long now, int badVersion) {
        if (!shouldDownload(current, latest) || latest == badVersion) return false;
        return latest != lastTriedVersion || now - lastTriedAt >= RETRY_SAME_VERSION_MS;
    }

    public static boolean verify(File apk, String sha256, long sizeBytes) {
        try {
            if (!apk.exists() || apk.length() != sizeBytes) return false;
            return Hashes.sha256Hex(apk).equals(sha256);
        } catch (java.io.IOException e) { return false; }
    }

    public static final long RETRY_ROLLBACK_MS = 2 * 60_000L;

    /**
     * Still running the version we rolled back from? Then that rollback didn't finish —
     * try it again, but at most every two minutes (a crashing app restarts several times a second).
     */
    public static boolean shouldRetryRollback(int current, int badVersion, long lastRollbackAt, long now) {
        return current == badVersion && now - lastRollbackAt >= RETRY_ROLLBACK_MS;
    }

    public static Decision decideOnStart(int currentVersion, PendingUpdate pending, List<Long> crashes, long now) {
        if (pending == null) return Decision.NONE;
        if (currentVersion != pending.toVersion) return Decision.CLEAR;
        int recent = 0;
        for (Long t : crashes) if (t >= pending.installedAt && t - pending.installedAt <= WATCH_MS) recent++;
        if (recent >= MAX_CRASHES) return Decision.ROLLBACK;
        if (now - pending.installedAt > WATCH_MS) return Decision.CLEAR;
        return Decision.KEEP_WATCHING;
    }
}
