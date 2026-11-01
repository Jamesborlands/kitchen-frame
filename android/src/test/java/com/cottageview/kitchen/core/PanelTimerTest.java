package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class PanelTimerTest {
    @Test public void closesAfterFortyFiveSecondsUntouched() {
        PanelTimer t = new PanelTimer();
        t.touched(0);
        assertFalse(t.expired(44_999));
        assertTrue(t.expired(45_001));
    }

    @Test public void aTouchStartsTheWaitAgain() {
        PanelTimer t = new PanelTimer();
        t.touched(0);
        t.touched(40_000);
        assertFalse(t.expired(80_000));
    }
}
