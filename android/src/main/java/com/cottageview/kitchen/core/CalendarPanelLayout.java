package com.cottageview.kitchen.core;

/** The full calendar panel: ‹ › Today on the left, Month / Week on the right, then the days. */
public final class CalendarPanelLayout {
    static final float BTN_H = 60, GAP = 10, HEAD = 26;
    public final Layout.Box previous, next, today, month, week, grid;
    /** Each day's box, in date order from the grid's first day (42 for a month, 7 for a week). */
    public final Layout.Box[] cells;
    private CalendarPanelLayout(Layout.Box previous, Layout.Box next, Layout.Box today, Layout.Box month, Layout.Box week, Layout.Box grid, Layout.Box[] cells) {
        this.previous = previous; this.next = next; this.today = today; this.month = month; this.week = week; this.grid = grid; this.cells = cells;
    }

    public static CalendarPanelLayout compute(Layout.Box body, CalendarGrid.Mode mode) {
        float t = body.t, b = t + BTN_H;
        Layout.Box prev = new Layout.Box(body.l, t, body.l + 72, b);
        Layout.Box next = new Layout.Box(prev.r + GAP, t, prev.r + GAP + 72, b);
        Layout.Box today = new Layout.Box(next.r + GAP, t, next.r + GAP + 120, b);
        Layout.Box week = new Layout.Box(body.r - 120, t, body.r, b);
        Layout.Box month = new Layout.Box(week.l - GAP - 120, t, week.l - GAP, b);
        Layout.Box grid = new Layout.Box(body.l, b + 16, body.r, body.b);
        int rows = mode == CalendarGrid.Mode.MONTH ? 6 : 1;
        float cw = grid.w() / 7, top = grid.t + HEAD, ch = (grid.b - top) / rows;
        Layout.Box[] cells = new Layout.Box[rows * 7];
        for (int r = 0; r < rows; r++) for (int c = 0; c < 7; c++) {
            float l = grid.l + c * cw, tt = top + r * ch;
            cells[r * 7 + c] = new Layout.Box(l + 2, tt + 2, l + cw - 2, tt + ch - 2);
        }
        return new CalendarPanelLayout(prev, next, today, month, week, grid, cells);
    }

    public int dayAt(float x, float y) {
        for (int i = 0; i < cells.length; i++) if (cells[i].contains(x, y)) return i;
        return -1;
    }
}
