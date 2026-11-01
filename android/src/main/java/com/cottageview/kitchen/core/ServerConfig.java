package com.cottageview.kitchen.core;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import org.json.JSONObject;

/**
 * Where the server is and the frame's key — both pushed over adb into the app's
 * private files/ dir (never baked into the APK), so the Cloudflare cut-over or a
 * key rotation needs no new build.
 */
public final class ServerConfig {
    public static final String DEFAULT_BASE_URL = "https://cottage-view.example.workers.dev";
    public final String baseUrl;
    public final String key;

    private ServerConfig(String baseUrl, String key) { this.baseUrl = baseUrl; this.key = key; }

    public static ServerConfig load(File dir) {
        String base = DEFAULT_BASE_URL;
        try {
            String s = readUtf8(new File(dir, "server.json"));
            if (s != null) {
                String u = new JSONObject(s).optString("baseUrl", "");
                if (u.startsWith("https://") || u.startsWith("http://")) base = u.endsWith("/") ? u.substring(0, u.length() - 1) : u;
            }
        } catch (Exception ignored) { /* keep default */ }
        String key = null;
        try {
            String k = readUtf8(new File(dir, "frame_key"));
            if (k != null && !k.trim().isEmpty()) key = k.trim();
        } catch (IOException ignored) { /* no key */ }
        return new ServerConfig(base, key);
    }

    public String resolve(String pathOrUrl) {
        if (pathOrUrl.startsWith("https://") || pathOrUrl.startsWith("http://")) return pathOrUrl;
        return baseUrl + (pathOrUrl.startsWith("/") ? "" : "/") + pathOrUrl;
    }

    public static String readUtf8(File f) throws IOException {
        if (!f.exists()) return null;
        try (InputStream in = new FileInputStream(f)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        }
    }
}
