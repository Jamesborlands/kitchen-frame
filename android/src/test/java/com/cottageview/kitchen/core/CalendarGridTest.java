package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class CalendarGridTest {
    @Test public void aMonthIsSixWeeksStartingMonday() {
        CalendarGrid g = CalendarGrid.month("2026-10-12");
        assertEquals("2026-09-28", g.from);      // Monday on or before 1 October
        assertEquals(42, g.days);
        assertEquals("October 2026", g.title);
        assertTrue(g.inFocus("2026-10-01"));
        assertFalse(g.inFocus("2026-09-30"));
        assertEquals("2026-10-01", CalendarGrid.month("2026-10-31").focusStart);
    }

    @Test public void aWeekIsMondayToSunday() {
        CalendarGrid g = CalendarGrid.week("2026-10-15"); // a Thursday
        assertEquals("2026-10-12", g.from);
        assertEquals(7, g.days);
        assertEquals("12 – 18 Oct 2026", g.title);
    }

    @Test public void nextAndPrevious() {
        assertEquals("November 2026", CalendarGrid.month("2026-10-12").next().title);
        assertEquals("January 2027", CalendarGrid.month("2026-12-01").next().title);
        assertEquals("September 2026", CalendarGrid.month("2026-10-12").previous().title);
        assertEquals("19 – 25 Oct 2026", CalendarGrid.week("2026-10-15").next().title);
        assertEquals("28 Sep – 4 Oct 2026", CalendarGrid.week("2026-10-01").title);
        assertEquals("29 Dec 2025 – 4 Jan 2026", CalendarGrid.week("2026-01-01").title);
    }

    @Test public void dateArithmetic() {
        assertEquals("2026-03-01", CalendarGrid.addDays("2026-02-28", 1));
        assertEquals("2024-02-29", CalendarGrid.addDays("2024-02-28", 1));
        assertEquals("2026-10-12", CalendarGrid.addDays("2026-10-01", 11));
        assertEquals(12, CalendarGrid.dayOfMonth("2026-10-12"));
    }
}
