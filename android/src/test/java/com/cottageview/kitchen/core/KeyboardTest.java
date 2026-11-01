package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class KeyboardTest {
    static final Layout.Box AREA = new Layout.Box(56, 300, 1310, 712);

    @Test public void bigKeysThatFitAndDontOverlap() {
        Keyboard k = Keyboard.layout(AREA);
        assertTrue(k.keys.size() >= 26 + 4);
        for (Keyboard.Key a : k.keys) {
            assertTrue(a.label, a.box.inside(AREA));
            assertTrue("big enough for a finger: " + a.label, a.box.h() >= 64 && a.box.w() >= 64);
            for (Keyboard.Key b : k.keys) if (a != b) assertFalse(a.label + "/" + b.label, a.box.overlaps(b.box));
        }
    }

    @Test public void typing() {
        Keyboard k = Keyboard.layout(AREA);
        Keyboard.Text t = new Keyboard.Text();
        for (String s : new String[] {"b", "u", "y", "space", "m", "i", "l", "k"}) t.press(k.find(s));
        assertEquals("Buy milk", t.value()); // first letter capitalised
        t.press(k.find("back"));
        assertEquals("Buy mil", t.value());
        for (int i = 0; i < 20; i++) t.press(k.find("back"));
        assertEquals("", t.value());
    }

    @Test public void tapsLandOnTheirKey() {
        Keyboard k = Keyboard.layout(AREA);
        Keyboard.Key q = k.find("q");
        assertSame(q, k.keyAt((q.box.l + q.box.r) / 2, (q.box.t + q.box.b) / 2));
        assertNull(k.keyAt(0, 0));
    }

    @Test public void stopsAtAHundredAndTwentyCharacters() {
        Keyboard k = Keyboard.layout(AREA);
        Keyboard.Text t = new Keyboard.Text();
        for (int i = 0; i < 200; i++) t.press(k.find("a"));
        assertEquals(120, t.value().length());
    }
}
