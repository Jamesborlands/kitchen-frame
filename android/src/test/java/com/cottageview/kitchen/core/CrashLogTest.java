package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import java.io.File;
import java.nio.file.Files;
import org.junit.Test;

public class CrashLogTest {
    @Test public void recordsAndKeepsTheLastTwenty() throws Exception {
        File f = new File(Files.createTempDirectory("cl").toFile(), "crashes.log");
        CrashLog log = new CrashLog(f);
        assertTrue(log.all().isEmpty());
        for (long i = 1; i <= 25; i++) log.record(i);
        assertEquals(20, log.all().size());
        assertEquals(Long.valueOf(6), log.all().get(0));
        assertEquals(Long.valueOf(25), log.all().get(19));
    }
    @Test public void survivesAGarbledLine() throws Exception {
        File f = new File(Files.createTempDirectory("cl").toFile(), "crashes.log");
        java.nio.file.Files.write(f.toPath(), "5\nnot-a-number\n7\n".getBytes("UTF-8"));
        assertEquals(2, new CrashLog(f).all().size());
    }
}
