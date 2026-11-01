package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import java.io.File;
import java.nio.file.Files;
import org.junit.Test;

public class FeedStoreTest {
    @Test public void roundTrips() throws Exception {
        File d = Files.createTempDirectory("fs").toFile();
        FeedStore s = new FeedStore(d);
        assertNull(s.load());
        s.save("{\"feedVersion\":1}");
        assertEquals("{\"feedVersion\":1}", s.load());
        s.save("{\"feedVersion\":1,\"x\":2}");
        assertEquals("{\"feedVersion\":1,\"x\":2}", new FeedStore(d).load());
        assertFalse(new File(d, "last-feed.json.tmp").exists());
    }
}
