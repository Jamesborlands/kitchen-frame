package com.cottageview.kitchen.core;

import java.util.Calendar;
import java.util.TimeZone;

/** The family clocks' "1:05" + "pm" in a place's own time zone (lib/time/clocks.ts readClock). */
public final class ClockText {
    public final String time, suffix;
    public final int hour24;

    private ClockText(String time, String suffix, int hour24) { this.time = time; this.suffix = suffix; this.hour24 = hour24; }

    public static ClockText of(String tzId, long now) {
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone(tzId));
        c.setTimeInMillis(now);
        int h = c.get(Calendar.HOUR_OF_DAY);
        int m = c.get(Calendar.MINUTE);
        int h12 = h % 12 == 0 ? 12 : h % 12;
        return new ClockText(h12 + ":" + (m < 10 ? "0" : "") + m, h < 12 ? "am" : "pm", h);
    }
}
