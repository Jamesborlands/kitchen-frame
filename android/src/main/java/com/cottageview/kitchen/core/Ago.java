package com.cottageview.kitchen.core;

/** "5 min ago", "3h ago", "yesterday" — when a message or photo arrived. */
public final class Ago {
    private Ago() {}

    public static String of(long at, long now) {
        long mins = Math.max(0, now - at) / 60_000;
        if (mins < 1) return "just now";
        if (mins < 60) return mins + " min ago";
        long hrs = mins / 60;
        if (hrs < 24) return hrs + "h ago";
        long days = hrs / 24;
        return days == 1 ? "yesterday" : days + " days ago";
    }
}
