package com.cottageview.kitchen.core;

/** The Wi-Fi screen: a "Look again" button, then a big tappable row per network. */
public final class WifiPanelLayout {
    static final float ROW_H = 60, GAP = 6;
    public final Layout.Box rescan;
    public final Layout.Box[] rows;
    private WifiPanelLayout(Layout.Box rescan, Layout.Box[] rows) { this.rescan = rescan; this.rows = rows; }

    public static WifiPanelLayout compute(Layout.Box body, int networks) {
        Layout.Box rescan = new Layout.Box(body.r - 200, body.t, body.r, body.t + 60);
        float top = body.t + 76;
        int fit = (int) Math.floor((body.b - top + GAP) / (ROW_H + GAP));
        Layout.Box[] rows = new Layout.Box[Math.max(0, Math.min(networks, fit))];
        for (int i = 0; i < rows.length; i++) {
            float t = top + i * (ROW_H + GAP);
            rows[i] = new Layout.Box(body.l, t, body.r, t + ROW_H);
        }
        return new WifiPanelLayout(rescan, rows);
    }

    public int rowAt(float x, float y) {
        for (int i = 0; i < rows.length; i++) if (rows[i].contains(x, y)) return i;
        return -1;
    }
}
