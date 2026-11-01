package com.cottageview.kitchen.core;

/** "updated 2h ago" — a port of lib/time/stale.ts. Fresh data (under 30 min) gets no label. */
public final class StaleLabel {
    private StaleLabel() {}
    public static final long STALE_AFTER_MS = 30 * 60_000L;

    public static String of(long fetchedAt, long now) {
        long age = now - fetchedAt;
        if (age < STALE_AFTER_MS) return null;
        long mins = age / 60_000L;
        if (mins < 60) return "updated " + mins + " min ago";
        long hrs = mins / 60;
        if (hrs < 48) return "updated " + hrs + "h ago";
        return "updated " + (hrs / 24) + " days ago";
    }
}
