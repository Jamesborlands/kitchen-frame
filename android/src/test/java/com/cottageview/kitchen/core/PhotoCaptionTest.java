package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class PhotoCaptionTest {
    static final long OCT_12_2026 = 1791800000000L; // 12 Oct 2026, UTC afternoon

    @Test public void whoAndWhen() { assertEquals("from Kate · 12 October", PhotoCaption.label("Kate", OCT_12_2026)); }
    @Test public void noSender() { assertEquals("12 October", PhotoCaption.label("  ", OCT_12_2026)); }
    @Test public void noDate() { assertEquals("from Kate", PhotoCaption.label("Kate", 0)); }
    @Test public void nothing() { assertEquals("", PhotoCaption.label(null, 0)); }
}
