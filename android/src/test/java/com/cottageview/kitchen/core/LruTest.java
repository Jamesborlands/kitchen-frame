package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class LruTest {
    @Test public void dropsTheLeastRecentlyUsed() {
        Lru<String, Integer> l = new Lru<>(2);
        l.put("a", 1);
        l.put("b", 2);
        l.get("a");      // a is now more recent than b
        l.put("c", 3);
        assertTrue(l.containsKey("a"));
        assertFalse(l.containsKey("b"));
        assertTrue(l.containsKey("c"));
    }
}
