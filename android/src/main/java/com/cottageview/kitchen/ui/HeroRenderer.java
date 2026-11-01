package com.cottageview.kitchen.ui;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.text.TextPaint;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.core.Layout;
import com.cottageview.kitchen.core.StaleLabel;

/** The watercolour weather card (components/TodayWeather.tsx, fill mode). */
final class HeroRenderer {
    private static final int SHADOW = 0x66000000;

    void draw(Canvas c, Layout.Box box, Feed.Weather w, Bitmap scene, long now) {
        RectF r = Draw.rect(box);
        c.drawRoundRect(r, 16, 16, Draw.fill(Palette.WASH & 0x66FFFFFF | 0x66000000));
        if (w == null) {
            TextPaint p = Draw.text(Fonts.sans, 15, Palette.MUTED);
            c.drawText("the weather will be back shortly", r.left + 24, r.bottom - 28, p);
            c.drawRoundRect(r, 16, 16, Draw.stroke(Palette.DIVIDER, 1));
            return;
        }
        Draw.imageCover(c, scene, r, 16, 255);
        // scrim: from-black/55 via-black/15 to-transparent, bottom to top
        Paint scrim = new Paint();
        scrim.setShader(new LinearGradient(0, r.bottom, 0, r.top,
            new int[]{0x8C000000, 0x26000000, 0x00000000}, new float[]{0f, 0.5f, 1f}, Shader.TileMode.CLAMP));
        c.drawRoundRect(r, 16, 16, scrim);
        c.drawRoundRect(r, 16, 16, Draw.stroke(Palette.DIVIDER, 1));

        float left = r.left + 24, bottom = r.bottom - 24, right = r.right - 24;
        TextPaint temp = Draw.text(Fonts.serif, 76, Palette.PAPER);
        temp.setShadowLayer(5, 0, 1, SHADOW);
        TextPaint body = Draw.text(Fonts.sans, 16, 0xD9F8F5F0);
        body.setShadowLayer(5, 0, 1, SHADOW);
        TextPaint small = Draw.text(Fonts.sans, 14, 0xCCF8F5F0);
        small.setShadowLayer(5, 0, 1, SHADOW);

        float half = r.width() * 0.58f;
        Draw.line(c, w.todayLine, left, bottom, half, small);
        Draw.line(c, w.summary, left, bottom - 24, half, body);
        c.drawText(w.tempC + "°", left - 4, bottom - 52, temp);

        float col = r.width() - half - 48;
        Draw.lineRight(c, w.moon, right, bottom, col, small);
        Draw.lineRight(c, w.sun, right, bottom - 22, col, small);
        Draw.lineRight(c, w.uv, right, bottom - 44, col, small);

        String stale = StaleLabel.of(w.fetchedAt, now);
        if (stale != null) {
            TextPaint p = Draw.text(Fonts.sans, 12, 0xE6F8F5F0);
            float tw = p.measureText(stale);
            RectF pill = new RectF(r.right - 16 - tw - 24, r.top + 16, r.right - 16, r.top + 16 + 26);
            c.drawRoundRect(pill, 13, 13, Draw.fill(0x59000000));
            c.drawText(stale, pill.left + 12, pill.top + 17, p);
        }
    }
}
