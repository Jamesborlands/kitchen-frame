package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class AgoTest {
    static final long MIN = 60_000;
    @Test public void words() {
        assertEquals("just now", Ago.of(0, 30_000));
        assertEquals("5 min ago", Ago.of(0, 5 * MIN));
        assertEquals("3h ago", Ago.of(0, 3 * 60 * MIN + 5));
        assertEquals("yesterday", Ago.of(0, 30 * 60 * MIN));
        assertEquals("3 days ago", Ago.of(0, 3 * 24 * 60 * MIN));
    }
}
