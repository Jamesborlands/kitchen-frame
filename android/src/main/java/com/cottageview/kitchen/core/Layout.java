package com.cottageview.kitchen.core;

/**
 * Where each section sits on the screen — the landscape /kitchen grid
 * (KitchenDashboard.tsx): left column 1fr (weather hero grows, 2×2 clocks,
 * notice), right column 1.1fr (photo grows, flap board under it when there
 * are notes), optional warning banner across the top. Pure geometry.
 */
public final class Layout {
    private Layout() {}

    public static final float PAD = 20, GAP = 20, ROW_GAP = 14;
    public static final float WARNING_H = 32, CLOCK_H = 86, CLOCK_GAP = 12;
    /** The bottom-left card: "Happening today" (layout 2; it was the 84 px notice card). */
    public static final float TODAY_H = 150;
    public static final float BOARD_PAD = 10, TILE_GAP = 3, TILE_ASPECT = 1.55f;

    public static final class Box {
        public final float l, t, r, b;
        public Box(float l, float t, float r, float b) { this.l = l; this.t = t; this.r = r; this.b = b; }
        public float w() { return r - l; }
        public float h() { return b - t; }
        public boolean inside(Box o) { return l >= o.l && t >= o.t && r <= o.r && b <= o.b; }
        public boolean overlaps(Box o) { return l < o.r && o.l < r && t < o.b && o.t < b; }
        public boolean contains(float x, float y) { return x >= l && x < r && y >= t && y < b; }
    }

    /**
     * The slim sidebar of buttons down the left: Calendar, To-do, Rides & walks, Messages.
     * Hidden behind a handle on the left edge until tapped; when open it lies over the kitchen.
     */
    public static final float RAIL_W = 72, RAIL_GAP = 14, RAIL_BTN_H = 86, RAIL_BTN_GAP = 10;
    public static final int RAIL_BUTTONS = 5; // at most
    /** The tap target on the left edge that opens the sidebar (a small tab is drawn in it). */
    public static final float HANDLE_W = 40, HANDLE_H = 120;

    public enum Rail { CALENDAR, TODO, RIDES, MESSAGES, SETTINGS }

    /** The sidebar's buttons, top to bottom, for what this household has on. */
    public static java.util.List<Rail> railButtons(Feed.Modules m) {
        java.util.List<Rail> out = new java.util.ArrayList<Rail>();
        out.add(Rail.CALENDAR);
        if (m.todos) out.add(Rail.TODO);
        if (m.rides) out.add(Rail.RIDES);
        out.add(Rail.MESSAGES);
        out.add(Rail.SETTINGS); // always: the family page and the WhatsApp number
        return out;
    }

    public static Box railButton(Box rail, int i) {
        float t = rail.t + 6 + i * (RAIL_BTN_H + RAIL_BTN_GAP);
        return new Box(rail.l + 4, t, rail.r - 4, t + RAIL_BTN_H);
    }

    /** The i-th family clock card in the clocks area: two across, CLOCK_H tall. */
    public static Box clockBox(Box area, int i) {
        float cw = (area.w() - CLOCK_GAP) / 2;
        float l = area.l + (i % 2) * (cw + CLOCK_GAP);
        float t = area.t + (i / 2) * (CLOCK_H + CLOCK_GAP);
        return new Box(l, t, l + cw, t + CLOCK_H);
    }

    public static final class Boxes {
        public final Box warning, hero, clocks, notice, photo, board, rail, handle;
        public final float tile;
        Boxes(Box warning, Box hero, Box clocks, Box notice, Box photo, Box board, Box rail, Box handle, float tile) {
            this.warning = warning; this.hero = hero; this.clocks = clocks; this.notice = notice;
            this.photo = photo; this.board = board; this.rail = rail; this.handle = handle; this.tile = tile;
        }
    }

    public static Boxes compute(int w, int h, boolean hasWarning, boolean hasBoard, int boardRows, int boardCols) {
        return compute(w, h, hasWarning, hasBoard, boardRows, boardCols, Feed.Modules.ALL);
    }

    /**
     * The screen for the household's modules. A module that's off frees its space:
     * no clocks → a taller weather picture; no Today card → the clocks move down;
     * no photos → the left side takes the width and the board (if on) runs along the bottom.
     * Boxes for what's off are null.
     */
    public static Boxes compute(int w, int h, boolean hasWarning, boolean hasBoard, int boardRows, int boardCols, Feed.Modules m) {
        return compute(w, h, hasWarning, hasBoard, boardRows, boardCols, m, false);
    }

    /** `railOpen`: the sidebar is out, and everything else moves along and shrinks to make room for it. */
    public static Boxes compute(int w, int h, boolean hasWarning, boolean hasBoard, int boardRows, int boardCols, Feed.Modules m, boolean railOpen) {
        hasBoard = hasBoard && m.board;
        float top = PAD;
        Box warning = null;
        if (hasWarning) {
            warning = new Box(PAD, top, w - PAD, top + WARNING_H);
            top += WARNING_H + ROW_GAP;
        }
        float bottom = h - PAD;
        Box rail = new Box(PAD, top, PAD + RAIL_W, bottom);
        float mid = (top + bottom) / 2;
        Box handle = new Box(0, mid - HANDLE_H / 2, HANDLE_W, mid + HANDLE_H / 2);
        float side = railOpen ? RAIL_W + RAIL_GAP : 0;
        float inner = w - 2 * PAD - GAP - side;
        float leftW = inner / 2.1f; // layout 3: left 1fr, right 1.1fr
        float leftL = PAD + side, leftR = leftL + leftW;
        float rightL = leftR + GAP, rightR = w - PAD;

        Box board = null;
        float tile = 0;
        if (!m.photos) {
            // no photo column: the left side takes the width; the board runs along the bottom under it
            leftR = rightR;
            if (hasBoard) {
                float avail = (leftR - leftL) - 2 * BOARD_PAD - (boardCols - 1) * TILE_GAP;
                tile = (float) Math.floor(Math.min(avail / boardCols, (bottom - top) * 0.2f / boardRows / TILE_ASPECT));
                float tileH = (float) Math.floor(tile * TILE_ASPECT);
                float boardH = 2 * BOARD_PAD + boardRows * tileH + (boardRows - 1) * TILE_GAP;
                board = new Box(leftL, bottom - boardH, leftR, bottom);
                bottom = board.t - ROW_GAP;
            }
        }

        float y = bottom;
        Box notice = null, clocks = null;
        if (m.today) {
            notice = new Box(leftL, y - TODAY_H, leftR, y);
            y = notice.t - ROW_GAP;
        }
        if (m.clocks) {
            float clocksH = 2 * CLOCK_H + CLOCK_GAP;
            clocks = new Box(leftL, y - clocksH, leftR, y);
            y = clocks.t - ROW_GAP;
        }
        Box hero = new Box(leftL, top, leftR, (notice == null && clocks == null) ? bottom : y);

        if (!m.photos) return new Boxes(warning, hero, clocks, notice, null, board, rail, handle, tile);

        float photoB = bottom;
        if (hasBoard) {
            float avail = (rightR - rightL) - 2 * BOARD_PAD - (boardCols - 1) * TILE_GAP;
            tile = (float) Math.floor(avail / boardCols);
            float tileH = (float) Math.floor(tile * TILE_ASPECT);
            float boardH = 2 * BOARD_PAD + boardRows * tileH + (boardRows - 1) * TILE_GAP;
            board = new Box(rightL, bottom - boardH, rightR, bottom);
            photoB = board.t - ROW_GAP;
        }
        Box photo = new Box(rightL, top, rightR, photoB);
        return new Boxes(warning, hero, clocks, notice, photo, board, rail, handle, tile);
    }
}
