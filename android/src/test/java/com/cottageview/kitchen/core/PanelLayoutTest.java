package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class PanelLayoutTest {
    @Test public void aCardWithABigCloseButtonInsideIt() {
        PanelLayout p = PanelLayout.compute(1366, 768);
        Layout.Box screen = new Layout.Box(0, 0, 1366, 768);
        assertTrue(p.card.inside(screen));
        assertTrue(p.close.inside(p.card));
        assertTrue(p.close.w() >= 72 && p.close.h() >= 72);
        assertTrue(p.close.r > p.card.r - 120 && p.close.t < p.card.t + 120);
        assertTrue(p.body.inside(p.card));
        assertFalse(p.body.overlaps(p.close));
    }
}
