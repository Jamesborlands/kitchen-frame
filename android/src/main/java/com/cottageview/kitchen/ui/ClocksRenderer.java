package com.cottageview.kitchen.ui;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.RectF;
import android.text.TextPaint;
import com.cottageview.kitchen.core.ClockText;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.core.Layout;
import com.cottageview.kitchen.core.TimeWindows;

/** The four family clock cards in a 2×2 grid (components/FamilyClockCard.tsx). */
final class ClocksRenderer {
    void draw(Canvas c, Layout.Box box, Feed feed, KitchenView.ImageSource images, long now) {
        int n = Math.min(4, feed.clocks.size());
        for (int i = 0; i < n; i++) {
            card(c, Draw.rect(Layout.clockBox(box, i)), feed.clocks.get(i), feed, images, now); // same boxes the taps use
        }
    }

    private void card(Canvas c, RectF r, Feed.Clock k, Feed feed, KitchenView.ImageSource images, long now) {
        c.drawRoundRect(r, 16, 16, Draw.fill(Palette.CARD));
        c.drawRoundRect(r, 16, 16, Draw.stroke(Palette.DIVIDER, 1));
        float pad = 12, thumb = 56;
        float ty = r.centerY() - thumb / 2;
        RectF tr = new RectF(r.left + pad, ty, r.left + pad + thumb, ty + thumb);
        c.drawRoundRect(tr, 12, 12, Draw.fill(0x66D4E4EE));
        Bitmap scene = images.scene(k.sceneUrl);
        Draw.imageCover(c, scene, tr, 12, 255);

        float x = tr.right + 12, right = r.right - pad;
        float rightCol = 96;
        float textW = right - x - rightCol;
        Draw.line(c, k.label, x, r.top + 28, textW, Draw.text(Fonts.sans, 16, Palette.INK));
        Draw.line(c, k.sublabel, x, r.top + 45, textW, Draw.text(Fonts.sans, 12, Palette.MUTED));

        ClockText ct = ClockText.of(k.timeZone, now);
        TextPaint time = Draw.text(Fonts.serif, 26, Palette.INK);
        c.drawText(ct.time, x, r.bottom - 14, time);
        float tx = x + time.measureText(ct.time) + 4;
        TextPaint suf = Draw.text(Fonts.serif, 14, Palette.MUTED);
        c.drawText(ct.suffix, tx, r.bottom - 15, suf);
        if (TimeWindows.inWindow(ct.hour24, feed.sleepStartHour, feed.sleepEndHour)) {
            Draw.moon(c, tx + suf.measureText(ct.suffix) + 12, r.bottom - 20, 6, 0xB378716C, Palette.CARD);
        }

        Draw.lineRight(c, k.tempC == null ? "—" : k.tempC + "°", right, r.top + 42, rightCol, Draw.text(Fonts.sans, 14, Palette.MUTED));
        Draw.lineRight(c, k.condition == null ? "" : k.condition, right, r.top + 60, rightCol, Draw.text(Fonts.sans, 12, Palette.MUTED));
    }
}
