package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class StaleLabelTest {
    static final long MIN = 60_000L;
    @Test public void freshHasNoLabel() { assertNull(StaleLabel.of(0, 29 * MIN)); }
    @Test public void minutes() { assertEquals("updated 30 min ago", StaleLabel.of(0, 30 * MIN)); }
    @Test public void hours() { assertEquals("updated 2h ago", StaleLabel.of(0, 125 * MIN)); }
    @Test public void days() { assertEquals("updated 3 days ago", StaleLabel.of(0, 72 * 60 * MIN)); }
    @Test public void justUnderTwoDaysIsHours() { assertEquals("updated 47h ago", StaleLabel.of(0, 47 * 60 * MIN)); }
}
