package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class TimeWindowsTest {
    @Test public void wrapsPastMidnight() {
        assertTrue(TimeWindows.inWindow(23, 23, 6));
        assertTrue(TimeWindows.inWindow(0, 23, 6));
        assertTrue(TimeWindows.inWindow(5, 23, 6));
        assertFalse(TimeWindows.inWindow(6, 23, 6));
        assertFalse(TimeWindows.inWindow(22, 23, 6));
    }
    @Test public void sameDayWindow() {
        assertTrue(TimeWindows.inWindow(9, 9, 17));
        assertFalse(TimeWindows.inWindow(17, 9, 17));
    }
    @Test public void emptyWhenStartEqualsEnd() { assertFalse(TimeWindows.inWindow(5, 5, 5)); }
    @Test public void londonHourAcrossTheOctoberClockChange() {
        // 2026-10-25 00:30 UTC = 01:30 BST; 01:30 UTC = 01:30 GMT (clocks went back at 02:00 BST)
        assertEquals(1, TimeWindows.hourIn("Europe/London", 1792888200000L));
        assertEquals(1, TimeWindows.hourIn("Europe/London", 1792891800000L));
        // 2026-10-11 22:30 UTC = 23:30 BST
        assertEquals(23, TimeWindows.hourIn("Europe/London", 1791757800000L));
    }
}
