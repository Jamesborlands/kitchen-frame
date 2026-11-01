package com.cottageview.kitchen.core;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

public class ClockTextTest {
    @Test public void afternoonInLondon() {
        ClockText c = ClockText.of("Europe/London", 1791720300000L); // 2026-10-11 12:05 UTC = 13:05 BST
        assertEquals("1:05", c.time);
        assertEquals("pm", c.suffix);
        assertEquals(13, c.hour24);
    }
    @Test public void midnightIsTwelveAm() {
        ClockText c = ClockText.of("UTC", 1791763200000L); // 2026-10-12 00:00 UTC
        assertEquals("12:00", c.time);
        assertEquals("am", c.suffix);
        assertEquals(0, c.hour24);
    }
    @Test public void queenstown() {
        ClockText c = ClockText.of("Pacific/Auckland", 1791720300000L); // 01:05 NZDT, the next day
        assertEquals("1:05", c.time);
        assertEquals("am", c.suffix);
    }
}
