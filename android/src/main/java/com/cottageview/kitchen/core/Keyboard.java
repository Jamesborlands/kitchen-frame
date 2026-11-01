package com.cottageview.kitchen.core;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** A big on-screen keyboard for adding a to-do on the frame (drawn by the app: no system keyboard needed). */
public final class Keyboard {
    public static final int MAX = 120;
    private static final String[] ROWS = { "qwertyuiop", "asdfghjkl'", "zxcvbnm,.?" };

    /** The password keyboard's pages (a to-do uses the plain letters layout). */
    public enum Page { LETTERS, CAPITALS, SYMBOLS }
    private static final String[][] PAGES = {
        { "qwertyuiop", "asdfghjkl.", "zxcvbnm-_@" },
        { "QWERTYUIOP", "ASDFGHJKL.", "ZXCVBNM-_@" },
        { "1234567890", "!#$%&*+=?/", "@()<>:;'\"," },
    };

    public static final class Key {
        public final String label; // a letter, "space", "back"
        public final Layout.Box box;
        Key(String label, Layout.Box box) { this.label = label; this.box = box; }
    }

    public final List<Key> keys;
    private Keyboard(List<Key> keys) { this.keys = Collections.unmodifiableList(keys); }

    /** Three rows of ten, then a wide space bar and a delete key, filling `area`. */
    public static Keyboard layout(Layout.Box area) {
        List<Key> out = new ArrayList<>();
        float gap = 10, kw = (area.w() - 9 * gap) / 10, kh = (area.h() - 3 * gap) / 4;
        for (int r = 0; r < ROWS.length; r++) {
            float t = area.t + r * (kh + gap);
            for (int i = 0; i < 10; i++) {
                float l = area.l + i * (kw + gap);
                out.add(new Key(String.valueOf(ROWS[r].charAt(i)), new Layout.Box(l, t, l + kw, t + kh)));
            }
        }
        float t = area.t + 3 * (kh + gap);
        float backL = area.r - 2 * kw - gap;
        out.add(new Key("space", new Layout.Box(area.l + 2 * (kw + gap), t, backL - gap - (kw + gap), t + kh)));
        out.add(new Key("back", new Layout.Box(backL, t, area.r, t + kh)));
        return new Keyboard(out);
    }

    /** A password keyboard page: ten keys a row, then shift / 123 (or abc), space and delete. */
    public static Keyboard layout(Layout.Box area, Page page) {
        List<Key> out = new ArrayList<>();
        float gap = 10, kw = (area.w() - 9 * gap) / 10, kh = (area.h() - 3 * gap) / 4;
        String[] rows = PAGES[page.ordinal()];
        for (int r = 0; r < rows.length; r++) {
            float t = area.t + r * (kh + gap);
            for (int i = 0; i < 10 && i < rows[r].length(); i++) {
                float l = area.l + i * (kw + gap);
                out.add(new Key(String.valueOf(rows[r].charAt(i)), new Layout.Box(l, t, l + kw, t + kh)));
            }
        }
        float t = area.t + 3 * (kh + gap), b = t + kh;
        float w2 = 2 * kw + gap;
        if (page == Page.SYMBOLS) {
            out.add(new Key("abc", new Layout.Box(area.l, t, area.l + w2, b)));
        } else {
            out.add(new Key("shift", new Layout.Box(area.l, t, area.l + w2, b)));
            out.add(new Key("123", new Layout.Box(area.l + w2 + gap, t, area.l + 2 * w2 + gap, b)));
        }
        out.add(new Key("back", new Layout.Box(area.r - w2, t, area.r, b)));
        out.add(new Key("space", new Layout.Box(area.l + 2 * (w2 + gap), t, area.r - w2 - gap, b)));
        return new Keyboard(out);
    }

    public Key keyAt(float x, float y) {
        for (Key k : keys) if (k.box.contains(x, y)) return k;
        return null;
    }

    public Key find(String label) {
        for (Key k : keys) if (k.label.equals(label)) return k;
        return null;
    }

    /** What's been typed so far. The first letter is a capital. */
    public static final class Text {
        private final StringBuilder sb = new StringBuilder();
        private final boolean sentence; // a to-do: first letter capital, no double spaces. A password: exactly as typed.

        public Text() { this(true); }
        public Text(boolean sentence) { this.sentence = sentence; }

        /** The page to show after pressing `k` (shift, 123 and abc switch pages; letters stay put). */
        public static Page pageAfter(Key k, Page page) {
            if (k == null) return page;
            if (k.label.equals("shift")) return page == Page.CAPITALS ? Page.LETTERS : Page.CAPITALS;
            if (k.label.equals("123")) return Page.SYMBOLS;
            if (k.label.equals("abc")) return Page.LETTERS;
            return page;
        }

        public void press(Key k) {
            if (k == null) return;
            String l = k.label;
            if (l.equals("shift") || l.equals("123") || l.equals("abc")) return;
            if (l.equals("back")) { if (sb.length() > 0) sb.setLength(sb.length() - 1); return; }
            if (sb.length() >= MAX) return;
            if (l.equals("space")) {
                if (!sentence) sb.append(' ');
                else if (sb.length() > 0 && sb.charAt(sb.length() - 1) != ' ') sb.append(' ');
                return;
            }
            sb.append(sentence && sb.length() == 0 ? l.toUpperCase(java.util.Locale.UK) : l);
        }

        public String value() { return sb.toString(); }
        public void clear() { sb.setLength(0); }
    }
}
