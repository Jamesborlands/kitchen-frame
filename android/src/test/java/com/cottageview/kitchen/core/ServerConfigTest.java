package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import org.junit.Test;

public class ServerConfigTest {
    static File dir() throws Exception { return Files.createTempDirectory("cfg").toFile(); }
    static void write(File f, String s) throws Exception { try (FileOutputStream o = new FileOutputStream(f)) { o.write(s.getBytes("UTF-8")); } }

    @Test public void defaultsWhenNothingPushed() throws Exception {
        ServerConfig c = ServerConfig.load(dir());
        assertEquals(ServerConfig.DEFAULT_BASE_URL, c.baseUrl);
        assertNull(c.key);
    }
    @Test public void readsPushedFiles() throws Exception {
        File d = dir();
        write(new File(d, "server.json"), "{\"baseUrl\":\"https://cv.example.workers.dev/\"}");
        write(new File(d, "frame_key"), "  secret-key\n");
        ServerConfig c = ServerConfig.load(d);
        assertEquals("https://cv.example.workers.dev", c.baseUrl);
        assertEquals("secret-key", c.key);
    }
    @Test public void ignoresABadBaseUrl() throws Exception {
        File d = dir();
        write(new File(d, "server.json"), "{\"baseUrl\":\"file:///etc\"}");
        assertEquals(ServerConfig.DEFAULT_BASE_URL, ServerConfig.load(d).baseUrl);
        write(new File(d, "server.json"), "not json");
        assertEquals(ServerConfig.DEFAULT_BASE_URL, ServerConfig.load(d).baseUrl);
    }
    @Test public void blankKeyIsNoKey() throws Exception {
        File d = dir();
        write(new File(d, "frame_key"), "   \n");
        assertNull(ServerConfig.load(d).key);
    }
    @Test public void resolvesPaths() throws Exception {
        ServerConfig c = ServerConfig.load(dir());
        assertEquals(ServerConfig.DEFAULT_BASE_URL + "/api/kitchen/feed", c.resolve("/api/kitchen/feed"));
        assertEquals("https://x.example/a.jpg", c.resolve("https://x.example/a.jpg"));
    }
}
