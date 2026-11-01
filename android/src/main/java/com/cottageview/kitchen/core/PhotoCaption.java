package com.cottageview.kitchen.core;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/** "from Kate · 12 October" under a tapped photo — leaving out whatever's unknown. */
public final class PhotoCaption {
    private PhotoCaption() {}

    public static String label(String from, long at) {
        String who = from == null || from.trim().isEmpty() ? null : "from " + from.trim();
        String when = null;
        if (at > 0) {
            SimpleDateFormat f = new SimpleDateFormat("d MMMM", Locale.UK);
            f.setTimeZone(TimeZone.getTimeZone("Europe/London"));
            when = f.format(new Date(at));
        }
        if (who != null && when != null) return who + " · " + when;
        return who != null ? who : when != null ? when : "";
    }
}
