package com.cottageview.kitchen.core;

import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

/** The full calendar's page: a month (six Monday-first weeks) or a week, as dates "YYYY-MM-DD". */
public final class CalendarGrid {
    public enum Mode { MONTH, WEEK }
    private static final String[] MONTHS = { "January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December" };

    public final Mode mode;
    /** First day shown, how many, and the stretch the page is about (the month itself, or the week). */
    public final String from, focusStart, focusEnd, title;
    public final int days;

    private CalendarGrid(Mode mode, String from, int days, String focusStart, String focusEnd, String title) {
        this.mode = mode; this.from = from; this.days = days; this.focusStart = focusStart; this.focusEnd = focusEnd; this.title = title;
    }

    public static CalendarGrid month(String anyDay) {
        String first = anyDay.substring(0, 8) + "01";
        Calendar c = cal(first);
        c.add(Calendar.MONTH, 1);
        c.add(Calendar.DAY_OF_MONTH, -1);
        String last = ymd(c);
        return new CalendarGrid(Mode.MONTH, monday(first), 42, first, last,
            MONTHS[Integer.parseInt(first.substring(5, 7)) - 1] + " " + first.substring(0, 4));
    }

    public static CalendarGrid week(String anyDay) {
        String mon = monday(anyDay), sun = addDays(mon, 6);
        String a = dayOfMonth(mon) + (mon.substring(5, 7).equals(sun.substring(5, 7)) ? "" : " " + shortMonth(mon))
            + (mon.substring(0, 4).equals(sun.substring(0, 4)) ? "" : " " + mon.substring(0, 4));
        return new CalendarGrid(Mode.WEEK, mon, 7, mon, sun, a + " – " + dayOfMonth(sun) + " " + shortMonth(sun) + " " + sun.substring(0, 4));
    }

    public static CalendarGrid of(Mode m, String anyDay) { return m == Mode.MONTH ? month(anyDay) : week(anyDay); }

    public CalendarGrid next() {
        return mode == Mode.MONTH ? month(addMonths(focusStart, 1)) : week(addDays(from, 7));
    }

    public CalendarGrid previous() {
        return mode == Mode.MONTH ? month(addMonths(focusStart, -1)) : week(addDays(from, -7));
    }

    /** In the month (or week) itself, not the spill-over days of the grid. */
    public boolean inFocus(String day) { return day.compareTo(focusStart) >= 0 && day.compareTo(focusEnd) <= 0; }

    public String dateAt(int i) { return addDays(from, i); }

    // ---- dates ----

    public static String addDays(String day, int n) {
        Calendar c = cal(day);
        c.add(Calendar.DAY_OF_MONTH, n);
        return ymd(c);
    }

    static String addMonths(String day, int n) {
        Calendar c = cal(day.substring(0, 8) + "01");
        c.add(Calendar.MONTH, n);
        return ymd(c);
    }

    public static int dayOfMonth(String day) { return Integer.parseInt(day.substring(8, 10)); }

    static String shortMonth(String day) { return MONTHS[Integer.parseInt(day.substring(5, 7)) - 1].substring(0, 3); }

    /** 1 = Monday … 7 = Sunday. */
    public static int weekday(String day) {
        int d = cal(day).get(Calendar.DAY_OF_WEEK); // Sunday = 1
        return d == Calendar.SUNDAY ? 7 : d - 1;
    }

    static String monday(String day) { return addDays(day, 1 - weekday(day)); }

    private static Calendar cal(String day) {
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone("UTC"), Locale.UK);
        c.clear();
        c.set(Integer.parseInt(day.substring(0, 4)), Integer.parseInt(day.substring(5, 7)) - 1, Integer.parseInt(day.substring(8, 10)), 12, 0, 0);
        return c;
    }

    private static String ymd(Calendar c) {
        return String.format(Locale.UK, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }
}
