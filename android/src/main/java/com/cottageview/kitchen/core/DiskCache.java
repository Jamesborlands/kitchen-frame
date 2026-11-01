package com.cottageview.kitchen.core;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Comparator;

/** URL-keyed image cache on disk; least-recently-used files go first once over maxBytes. */
public final class DiskCache {
    private final File dir;
    private final long maxBytes;

    public DiskCache(File dir, long maxBytes) {
        this.dir = dir;
        this.maxBytes = maxBytes;
        dir.mkdirs();
    }

    public File get(String url) {
        File f = new File(dir, Hashes.sha1Hex(url));
        if (!f.exists()) return null;
        f.setLastModified(System.currentTimeMillis());
        return f;
    }

    public File put(String url, byte[] data) throws IOException {
        File f = new File(dir, Hashes.sha1Hex(url));
        File tmp = new File(dir, f.getName() + ".tmp");
        try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(data); }
        if (!tmp.renameTo(f)) throw new IOException("rename failed");
        f.setLastModified(System.currentTimeMillis());
        trim(f);
        return f;
    }

    private void trim(File keep) {
        File[] files = dir.listFiles();
        if (files == null) return;
        long total = 0;
        for (File x : files) total += x.length();
        Arrays.sort(files, new Comparator<File>() {
            @Override public int compare(File a, File b) { return Long.compare(a.lastModified(), b.lastModified()); }
        });
        for (File x : files) {
            if (total <= maxBytes) break;
            if (x.equals(keep)) continue;
            total -= x.length();
            x.delete();
        }
    }
}
