package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class DrawerTest {
    @Test public void opensOnATapAndTucksItselfAwayAfterAWhile() {
        Drawer d = new Drawer();
        assertFalse(d.isOpen(0));
        d.open(1000);
        assertTrue(d.isOpen(1000 + Drawer.OPEN_MS - 1));
        assertFalse(d.isOpen(1000 + Drawer.OPEN_MS + 1));
    }

    @Test public void closesWhenAskedAndATouchKeepsItOpen() {
        Drawer d = new Drawer();
        d.open(0);
        d.open(Drawer.OPEN_MS - 10); // touched again: another full stretch
        assertTrue(d.isOpen(Drawer.OPEN_MS + 100));
        d.close();
        assertFalse(d.isOpen(Drawer.OPEN_MS + 101));
    }
}
