package com.cottageview.kitchen.ui;

import android.graphics.Canvas;
import android.graphics.RectF;
import android.text.TextPaint;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.core.Layout;
import com.cottageview.kitchen.core.PhotoCaption;
import com.cottageview.kitchen.core.PhotoMenu;
import com.cottageview.kitchen.core.PhotoMenuLayout;

/** Draws the tap-a-photo menu over the photo: who sent it, "✕ Remove", and "Remove this photo?". */
final class PhotoMenuRenderer {
    private static final int SCRIM = 0x99000000, WHITE = 0xFFFFFFFF, ROSE = 0xFFB0504A, INK = 0xFF1C1917;
    void draw(Canvas c, Layout.Box box, PhotoMenu.State state, Feed.Photo photo, long now, String heartFailure) {
        if (state == PhotoMenu.State.NONE) return;
        if (state == PhotoMenu.State.DETAILS && photo == null) return; // removed meanwhile; the rest don't need it
        RectF r = Draw.rect(box);
        PhotoMenuLayout m = PhotoMenuLayout.compute(box);
        switch (state) {
            case DETAILS: {
                // a band along the bottom with who and when, and the remove pill top-right
                RectF band = new RectF(r.left, r.bottom - 64, r.right, r.bottom);
                c.save();
                c.clipRect(band);
                c.drawRoundRect(r, 16, 16, Draw.fill(SCRIM));
                c.restore();
                TextPaint t = Draw.text(Fonts.sans, 24, WHITE);
                Draw.line(c, PhotoCaption.label(photo.from, photo.at), r.left + 20, r.bottom - 23, r.width() - 40, t);
                pill(c, m.remove, "✕  Remove", 0xEEFFFFFF, INK);
                if (PhotoMenu.canHeart(photo, now)) {
                    heartPill(c, m.heart, "Send a heart", 0xEEFFFFFF, INK);
                } else if (photo.loved) {
                    heartPill(c, m.heart, "Heart sent", 0xCC1C1917, WHITE);
                }
                break;
            }
            case SENDING_HEART:
                c.drawRoundRect(r, 16, 16, Draw.fill(SCRIM));
                centred(c, r, r.centerY(), "Sending a heart…", 30);
                break;
            case HEARTED:
                c.drawRoundRect(r, 16, 16, Draw.fill(SCRIM));
                heart(c, r.centerX(), r.centerY() - 60, 34, ROSE);
                centred(c, r, r.centerY() + 20, photo != null && photo.from != null && !photo.from.isEmpty() ? "Sent to " + photo.from + " ✓" : "Heart sent ✓", 30);
                centred(c, r, r.centerY() + 56, "It shows on their photo in WhatsApp.", 20);
                break;
            case HEART_FAILED:
                c.drawRoundRect(r, 16, 16, Draw.fill(SCRIM));
                centred(c, r, r.centerY(), heartFailure != null ? heartFailure : "Couldn't send the heart just now.", 26);
                centred(c, r, r.centerY() + 36, "Check the Wi-Fi and try again.", 20);
                break;
            case CONFIRM:
                c.drawRoundRect(r, 16, 16, Draw.fill(SCRIM));
                centred(c, r, r.top + r.height() * 0.32f, "Remove this photo from the frame?", 30);
                centred(c, r, r.top + r.height() * 0.32f + 40, "It goes to the bin on the family site.", 20);
                pill(c, m.yes, "Yes, remove", ROSE, WHITE);
                pill(c, m.no, "No, keep it", WHITE, INK);
                break;
            case REMOVING:
                c.drawRoundRect(r, 16, 16, Draw.fill(SCRIM));
                centred(c, r, r.centerY(), "Removing…", 30);
                break;
            case REMOVED:
                c.drawRoundRect(r, 16, 16, Draw.fill(SCRIM));
                centred(c, r, r.centerY(), "Removed ✓", 30);
                break;
            case FAILED:
                c.drawRoundRect(r, 16, 16, Draw.fill(SCRIM));
                centred(c, r, r.centerY(), "Couldn't remove it just now.", 28);
                centred(c, r, r.centerY() + 36, "Check the Wi-Fi and try again.", 20);
                break;
            default:
                break;
        }
    }

    private static void pill(Canvas c, Layout.Box b, String label, int bg, int fg) {
        RectF r = Draw.rect(b);
        c.drawRoundRect(r, r.height() / 2, r.height() / 2, Draw.fill(bg));
        TextPaint t = Draw.text(Fonts.sans, 24, fg);
        c.drawText(label, r.centerX() - t.measureText(label) / 2, r.centerY() + 8, t);
    }

    private static void heartPill(Canvas c, Layout.Box b, String label, int bg, int fg) {
        RectF r = Draw.rect(b);
        c.drawRoundRect(r, r.height() / 2, r.height() / 2, Draw.fill(bg));
        heart(c, r.left + 40, r.centerY(), 13, ROSE);
        TextPaint t = Draw.text(Fonts.sans, 24, fg);
        c.drawText(label, r.left + 66, r.centerY() + 8, t);
    }

    /** A heart drawn as a path (the frame's Android 4.4 has no colour emoji). */
    static void heart(Canvas c, float cx, float cy, float s, int color) {
        android.graphics.Path p = new android.graphics.Path();
        p.moveTo(cx, cy + s);
        p.cubicTo(cx - s * 2.2f, cy - s * 0.4f, cx - s * 0.9f, cy - s * 1.9f, cx, cy - s * 0.7f);
        p.cubicTo(cx + s * 0.9f, cy - s * 1.9f, cx + s * 2.2f, cy - s * 0.4f, cx, cy + s);
        p.close();
        c.drawPath(p, Draw.fill(color));
    }

    private static void centred(Canvas c, RectF r, float y, String s, float size) {
        TextPaint t = Draw.text(Fonts.sans, size, WHITE);
        Draw.line(c, s, r.centerX() - Math.min(t.measureText(s), r.width() - 40) / 2, y, r.width() - 40, t);
    }
}
