package com.cottageview.kitchen.core;

/** The Today panel: today and tomorrow on the left; the to-do list on the right as big tappable rows. */
public final class TodayPanelLayout {
    static final float GAP = 32, ROW_H = 72, ROW_GAP = 10, LIST_TOP = 44;

    public final Layout.Box todayColumn, todoColumn, addButton;
    public final Layout.Box[] todoRows;

    private TodayPanelLayout(Layout.Box today, Layout.Box todo, Layout.Box[] rows, Layout.Box add) {
        todayColumn = today; todoColumn = todo; todoRows = rows; addButton = add;
    }

    public static TodayPanelLayout compute(Layout.Box body, int todos) {
        float mid = body.l + (body.w() - GAP) * 0.55f;
        Layout.Box today = new Layout.Box(body.l, body.t, mid, body.b);
        Layout.Box todo = new Layout.Box(mid + GAP, body.t, body.r, body.b);
        // "+ Add a to-do" along the bottom of the column; the rows fill the space above it
        Layout.Box add = new Layout.Box(todo.l, todo.b - ROW_H, todo.r, todo.b);
        int fit = (int) Math.floor((todo.h() - ROW_H - ROW_GAP - LIST_TOP + ROW_GAP) / (ROW_H + ROW_GAP));
        int n = Math.max(0, Math.min(todos, fit));
        Layout.Box[] rows = new Layout.Box[n];
        for (int i = 0; i < n; i++) {
            float t = todo.t + LIST_TOP + i * (ROW_H + ROW_GAP);
            rows[i] = new Layout.Box(todo.l, t, todo.r, t + ROW_H);
        }
        return new TodayPanelLayout(today, todo, rows, add);
    }

    /** Which to-do row a tap hit, or -1. */
    public int rowAt(float x, float y) {
        for (int i = 0; i < todoRows.length; i++) if (todoRows[i].contains(x, y)) return i;
        return -1;
    }
}
