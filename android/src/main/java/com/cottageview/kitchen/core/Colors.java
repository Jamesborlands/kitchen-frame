package com.cottageview.kitchen.core;

/** "#RRGGBB" → opaque ARGB int; anything else → the fallback. */
public final class Colors {
    private Colors() {}

    public static int parse(String hex, int fallback) {
        if (hex == null || hex.length() != 7 || hex.charAt(0) != '#') return fallback;
        try { return 0xFF000000 | Integer.parseInt(hex.substring(1), 16); }
        catch (NumberFormatException e) { return fallback; }
    }
}
