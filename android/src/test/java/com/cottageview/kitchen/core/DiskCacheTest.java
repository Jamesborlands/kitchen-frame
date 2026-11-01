package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import java.io.File;
import java.nio.file.Files;
import org.junit.Test;

public class DiskCacheTest {
    @Test public void storesAndFinds() throws Exception {
        DiskCache c = new DiskCache(Files.createTempDirectory("dc").toFile(), 1000);
        assertNull(c.get("https://a/1.jpg"));
        File f = c.put("https://a/1.jpg", new byte[]{1, 2, 3});
        assertEquals(3, f.length());
        assertEquals(f, c.get("https://a/1.jpg"));
    }
    @Test public void evictsLeastRecentlyUsed() throws Exception {
        DiskCache c = new DiskCache(Files.createTempDirectory("dc").toFile(), 250);
        c.put("u1", new byte[100]);
        c.get("u1").setLastModified(1000);
        c.put("u2", new byte[100]);
        c.get("u2").setLastModified(3000);
        c.get("u1").setLastModified(4000); // u1 used most recently
        c.put("u3", new byte[100]); // 300 > 250 → evict oldest (u2)
        assertNotNull(c.get("u1"));
        assertNull(c.get("u2"));
        assertNotNull(c.get("u3"));
    }
    @Test public void neverEvictsTheEntryJustWritten() throws Exception {
        DiskCache c = new DiskCache(Files.createTempDirectory("dc").toFile(), 50);
        c.put("big", new byte[100]);
        assertNotNull(c.get("big"));
    }
}
