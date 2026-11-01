package com.cottageview.kitchen.core;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

public class ColorsTest {
    @Test public void parsesHex() { assertEquals(0xFFF2E5CF, Colors.parse("#F2E5CF", 0)); }
    @Test public void lowerCaseToo() { assertEquals(0xFF6b7c6b, Colors.parse("#6b7c6b", 0)); }
    @Test public void fallsBack() {
        assertEquals(7, Colors.parse("var(--x)", 7));
        assertEquals(7, Colors.parse(null, 7));
        assertEquals(7, Colors.parse("#12345", 7));
    }
}
