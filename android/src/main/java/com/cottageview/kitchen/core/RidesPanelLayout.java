package com.cottageview.kitchen.core;

/** Rides & walks: the ready-made routes are tappable rows; a route opens as a map with a ‹ Back button. */
public final class RidesPanelLayout {
    static final float TOP = 178, LEFT_SHARE = 0.46f, ROW_H = 48, ROW_GAP = 4, LIST_TOP = 30;
    public final Layout.Box routesColumn, back, map;
    public final Layout.Box[] routeRows;
    private RidesPanelLayout(Layout.Box routesColumn, Layout.Box[] rows, Layout.Box back, Layout.Box map) {
        this.routesColumn = routesColumn; this.routeRows = rows; this.back = back; this.map = map;
    }

    public static RidesPanelLayout compute(Layout.Box body, int routes) {
        float rl = body.l + body.w() * LEFT_SHARE + 24, top = body.t + TOP;
        Layout.Box col = new Layout.Box(rl, top, body.r, body.b);
        int fit = (int) Math.floor((col.h() - LIST_TOP + ROW_GAP) / (ROW_H + ROW_GAP));
        Layout.Box[] rows = new Layout.Box[Math.max(0, Math.min(routes, fit))];
        for (int i = 0; i < rows.length; i++) {
            float t = top + LIST_TOP + i * (ROW_H + ROW_GAP);
            rows[i] = new Layout.Box(rl, t, body.r, t + ROW_H);
        }
        Layout.Box back = new Layout.Box(body.l, body.t, body.l + 150, body.t + 60);
        Layout.Box map = new Layout.Box(body.l, back.b + 16, body.r, body.b);
        return new RidesPanelLayout(col, rows, back, map);
    }

    public int routeAt(float x, float y) {
        for (int i = 0; i < routeRows.length; i++) if (routeRows[i].contains(x, y)) return i;
        return -1;
    }
}
