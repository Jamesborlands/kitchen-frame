package com.cottageview.kitchen.ui;

import android.graphics.Bitmap;
import android.graphics.Camera;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.text.TextPaint;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.core.Layout;
import com.cottageview.kitchen.core.Rotator;

/**
 * The split-flap message board under the photo (components/ui/text-flipping-board.tsx), 2×18 in the kitchen.
 *
 * Each page's tile faces are drawn once into a bitmap; a flip frame is then only
 * bitmap copies — unchanged tiles from the new face, flipping tiles from halves of
 * the old and new faces — with no text drawing or allocation per frame. (Drawing
 * 36 tiles of text every frame ran at ~25fps on the A33.)
 */
final class BoardRenderer {
    static final long FLIP_MS = 420, STAGGER_MS = 22;
    private final Camera cam = new Camera();
    private final Matrix m = new Matrix();
    private final Paint blit = new Paint(Paint.FILTER_BITMAP_FLAG);
    private final Paint bg = Draw.fill(Palette.BOARD_BG);
    private final Rect src = new Rect();
    private final RectF dst = new RectF();

    private int shownIndex = -1;
    private String shownKey;
    private char[][] from, to;
    private Bitmap oldFace, newFace;

    /** @return true while tiles are flipping */
    boolean draw(Canvas c, Layout.Box box, float tile, Feed.Board board, Rotator.State s) {
        RectF r = Draw.rect(box);
        Feed.BoardPage page = board.pages.get(s.index);
        String key = s.index + "|" + page.lines + "|" + (int) box.w() + "x" + (int) box.h();
        if (s.index != shownIndex || !key.equals(shownKey) || newFace == null) {
            from = to;
            to = grid(page, board.rows, board.cols);
            if (oldFace != null) oldFace.recycle();
            oldFace = newFace;
            newFace = face(to, box, tile, board.rows, board.cols);
            shownIndex = s.index;
            shownKey = key;
        }

        c.drawRoundRect(r, 12, 12, bg);
        float th = (float) Math.floor(tile * Layout.TILE_ASPECT);
        boolean animating = false;
        if (from == null || oldFace == null || s.sinceSwitchMs >= FLIP_MS + STAGGER_MS * (board.cols + board.rows * 3)) {
            c.drawBitmap(newFace, r.left, r.top, blit);
        } else {
            for (int row = 0; row < board.rows; row++) {
                for (int col = 0; col < board.cols; col++) {
                    float l = Layout.BOARD_PAD + col * (tile + Layout.TILE_GAP);
                    float t = Layout.BOARD_PAD + row * (th + Layout.TILE_GAP);
                    char now = to[row][col], was = from[row][col];
                    long local = s.sinceSwitchMs - (col + row * 3) * STAGGER_MS;
                    if (was == now || local >= FLIP_MS) {
                        copy(c, newFace, l, t, l + tile, t + th, r);
                    } else if (local < 0) {
                        copy(c, oldFace, l, t, l + tile, t + th, r);
                        animating = true;
                    } else {
                        flip(c, l, t, tile, th, local / (float) FLIP_MS, r);
                        animating = true;
                    }
                }
            }
        }
        if (page.initials != null && !page.initials.isEmpty()) Draw.badge(c, page.initials, r.right - 24, r.bottom - 24, 16);
        return animating;
    }

    /** Copy a tile-sized region (face coordinates) from a face bitmap to the same spot on screen. */
    private void copy(Canvas c, Bitmap face, float l, float t, float rr, float b, RectF board) {
        src.set((int) l, (int) t, (int) Math.ceil(rr), (int) Math.ceil(b));
        dst.set(board.left + src.left, board.top + src.top, board.left + src.right, board.top + src.bottom);
        c.drawBitmap(face, src, dst, blit);
    }

    /** Old top half falls away (0→90°), then the new bottom half drops in (−90→0°). */
    private void flip(Canvas c, float l, float t, float w, float h, float p, RectF board) {
        float mid = t + h / 2;
        copy(c, newFace, l, t, l + w, mid, board);     // new top half, revealed behind
        copy(c, oldFace, l, mid, l + w, t + h, board); // old bottom half, covered at the end
        boolean firstHalf = p < 0.5f;
        float deg = firstHalf ? p * 2 * 90f : -90f + (p - 0.5f) * 2 * 90f;
        float cx = board.left + l + w / 2, cy = board.top + mid;
        c.save();
        cam.save();
        cam.rotateX(-deg);
        cam.getMatrix(m);
        cam.restore();
        m.preTranslate(-cx, -cy);
        m.postTranslate(cx, cy);
        c.concat(m);
        if (firstHalf) copy(c, oldFace, l, t, l + w, mid, board);
        else copy(c, newFace, l, mid, l + w, t + h, board);
        c.restore();
    }

    /** One page's tiles, drawn once. Face coordinates are relative to the board's top-left. */
    private static Bitmap face(char[][] g, Layout.Box box, float tile, int rows, int cols) {
        Bitmap bmp = Bitmap.createBitmap((int) Math.ceil(box.w()), (int) Math.ceil(box.h()), Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        float th = (float) Math.floor(tile * Layout.TILE_ASPECT);
        TextPaint tp = Draw.text(Fonts.sans, th * 0.56f, Palette.TILE_TEXT);
        Paint top = Draw.fill(Palette.TILE_TOP), bottom = Draw.fill(Palette.TILE_BOTTOM);
        Paint border = Draw.stroke(Palette.TILE_BORDER, 1), hinge = Draw.fill(Palette.TILE_HINGE);
        for (int row = 0; row < rows; row++) {
            for (int col = 0; col < cols; col++) {
                float l = Layout.BOARD_PAD + col * (tile + Layout.TILE_GAP);
                float t = Layout.BOARD_PAD + row * (th + Layout.TILE_GAP);
                float mid = t + th / 2;
                c.drawRect(l, t, l + tile, mid, top);
                c.drawRect(l, mid, l + tile, t + th, bottom);
                c.drawRect(l, t, l + tile, t + th, border);
                char ch = g[row][col];
                if (ch != ' ') {
                    String s = String.valueOf(ch);
                    c.drawText(s, l + tile / 2 - tp.measureText(s) / 2, mid + tp.getTextSize() * 0.36f, tp);
                }
                c.drawLine(l, mid, l + tile, mid, hinge);
            }
        }
        return bmp;
    }

    private static char[][] grid(Feed.BoardPage page, int rows, int cols) {
        char[][] g = new char[rows][cols];
        for (int row = 0; row < rows; row++) {
            String line = row < page.lines.size() ? page.lines.get(row).toUpperCase(java.util.Locale.UK) : "";
            int pad = Math.max(0, (cols - line.length()) / 2); // centred, like the web board
            for (int col = 0; col < cols; col++) {
                int i = col - pad;
                g[row][col] = i >= 0 && i < line.length() ? line.charAt(i) : ' ';
            }
        }
        return g;
    }
}
