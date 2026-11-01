package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class LatestTest {
    @Test public void somethingNewWhenTheMarkerDiffers() throws Exception {
        String json = FeedParserTest.full().replaceFirst("\\}$", ",\"latest\":\"p1|n1\"}");
        Feed f = FeedParser.parse(json);
        assertEquals("p1|n1", f.latest);
        assertFalse(Latest.isNew(f, "{\"latest\":\"p1|n1\"}"));
        assertTrue(Latest.isNew(f, "{\"latest\":\"p2|n1\"}"));
        assertFalse("an older server: no marker, nothing to compare", Latest.isNew(FeedParser.parse(FeedParserTest.full()), "{\"latest\":\"x\"}"));
        assertFalse("junk", Latest.isNew(f, "nope"));
    }
}
