package com.cottageview.kitchen.core;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

public class BackoffTest {
    @Test public void doublesThenCaps() {
        Backoff b = new Backoff();
        assertEquals(5_000, b.next());
        assertEquals(10_000, b.next());
        assertEquals(20_000, b.next());
        for (int i = 0; i < 10; i++) b.next();
        assertEquals(300_000, b.next());
    }
    @Test public void resetStartsAgain() {
        Backoff b = new Backoff();
        b.next(); b.next();
        b.reset();
        assertEquals(5_000, b.next());
    }
}
