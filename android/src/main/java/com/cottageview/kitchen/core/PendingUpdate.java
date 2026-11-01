package com.cottageview.kitchen.core;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import org.json.JSONObject;

/** Written just before a self-install; read at the next start to decide whether the new version is healthy. */
public final class PendingUpdate {
    public final int fromVersion, toVersion;
    public final long installedAt;

    public PendingUpdate(int fromVersion, int toVersion, long installedAt) {
        this.fromVersion = fromVersion; this.toVersion = toVersion; this.installedAt = installedAt;
    }

    public String toJson() {
        try {
            return new JSONObject().put("fromVersion", fromVersion).put("toVersion", toVersion).put("installedAt", installedAt).toString();
        } catch (org.json.JSONException e) { throw new IllegalStateException(e); }
    }

    public static PendingUpdate parse(String s) {
        try {
            JSONObject j = new JSONObject(s);
            return new PendingUpdate(j.getInt("fromVersion"), j.getInt("toVersion"), j.getLong("installedAt"));
        } catch (Exception e) { return null; }
    }

    public void save(File f) throws IOException {
        try (FileOutputStream o = new FileOutputStream(f)) { o.write(toJson().getBytes("UTF-8")); o.getFD().sync(); }
    }

    public static PendingUpdate load(File f) {
        try { String s = ServerConfig.readUtf8(f); return s == null ? null : parse(s); } catch (IOException e) { return null; }
    }

    public static void clear(File f) { f.delete(); }
}
