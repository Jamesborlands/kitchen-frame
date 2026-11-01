package com.cottageview.kitchen.core;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/** The last good feed on disk, so the kitchen draws instantly at boot — before, or without, the network. */
public final class FeedStore {
    private final File file, tmp;

    public FeedStore(File dir) {
        file = new File(dir, "last-feed.json");
        tmp = new File(dir, "last-feed.json.tmp");
    }

    public void save(String json) throws IOException {
        try (FileOutputStream o = new FileOutputStream(tmp)) {
            o.write(json.getBytes("UTF-8"));
            o.getFD().sync();
        }
        if (!tmp.renameTo(file)) throw new IOException("rename failed");
    }

    public String load() {
        try { return ServerConfig.readUtf8(file); } catch (IOException e) { return null; }
    }
}
