package com.cottageview.kitchen.core;

import java.util.Calendar;
import java.util.TimeZone;

/** Hour-of-day windows (night mode, "asleep" clocks), wrapping past midnight when start > end. */
public final class TimeWindows {
    private TimeWindows() {}

    public static boolean inWindow(int hour, int start, int end) {
        if (start == end) return false;
        return start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
    }

    public static int hourIn(String tzId, long now) {
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone(tzId));
        c.setTimeInMillis(now);
        return c.get(Calendar.HOUR_OF_DAY);
    }
}
