package com.cottageview.kitchen.core;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/** Crash timestamps (newest last, at most 20) — the evidence for rolling back a bad update. */
public final class CrashLog {
    static final int KEEP = 20;
    private final File file;

    public CrashLog(File file) { this.file = file; }

    public List<Long> all() {
        List<Long> out = new ArrayList<>();
        try {
            String s = ServerConfig.readUtf8(file);
            if (s == null) return out;
            for (String line : s.split("\n")) {
                try { out.add(Long.parseLong(line.trim())); } catch (NumberFormatException ignored) { /* skip */ }
            }
        } catch (IOException ignored) { /* empty */ }
        return out;
    }

    public void record(long at) {
        List<Long> all = all();
        all.add(at);
        List<Long> keep = all.subList(Math.max(0, all.size() - KEEP), all.size());
        StringBuilder sb = new StringBuilder();
        for (Long t : keep) sb.append(t).append('\n');
        try (FileOutputStream o = new FileOutputStream(file)) { o.write(sb.toString().getBytes("UTF-8")); o.getFD().sync(); }
        catch (IOException ignored) { /* best effort while crashing */ }
    }
}
