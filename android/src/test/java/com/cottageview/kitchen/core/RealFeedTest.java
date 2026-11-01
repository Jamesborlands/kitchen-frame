package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import java.nio.file.Files;
import java.nio.file.Paths;
import org.junit.Test;

/** The parser agrees with what the real server sends (assets/sample-feed.json came from /api/kitchen/feed). */
public class RealFeedTest {
    @Test public void parsesTheServersOwnFeed() throws Exception {
        String json = new String(Files.readAllBytes(Paths.get("assets/sample-feed.json")), "UTF-8");
        Feed f = FeedParser.parse(json);
        assertNotNull("weather", f.weather);
        assertNotNull("warning", f.warning);
        assertEquals(4, f.clocks.size());
        assertFalse(f.notices.isEmpty());
        assertEquals(2, f.photos.size());
        assertNotNull("board", f.board);
        assertEquals("Europe/London", f.nightTimeZone);
    }
}
