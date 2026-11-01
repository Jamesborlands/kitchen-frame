package com.cottageview.kitchen.core;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/** Hex digests: sha256 to verify update APKs, sha1 to name cache files. */
public final class Hashes {
    private Hashes() {}

    public static String sha256Hex(byte[] data) { return hex(digest("SHA-256").digest(data)); }

    public static String sha1Hex(String s) {
        try { return hex(digest("SHA-1").digest(s.getBytes("UTF-8"))); }
        catch (java.io.UnsupportedEncodingException e) { throw new IllegalStateException(e); }
    }

    public static String sha256Hex(File f) throws IOException {
        MessageDigest md = digest("SHA-256");
        try (InputStream in = new FileInputStream(f)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
        }
        return hex(md.digest());
    }

    private static MessageDigest digest(String alg) {
        try { return MessageDigest.getInstance(alg); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    private static String hex(byte[] b) {
        StringBuilder sb = new StringBuilder(b.length * 2);
        for (byte x : b) sb.append(String.format("%02x", x & 0xff));
        return sb.toString();
    }
}
