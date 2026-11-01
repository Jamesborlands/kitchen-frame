package com.cottageview.kitchen.ui;

import android.graphics.Canvas;
import android.text.TextPaint;
import com.cottageview.kitchen.core.ClockText;

/** Night mode (components/NightCurtain.tsx): a dim Ludlow clock on near-black. */
final class NightRenderer {
    void draw(Canvas c, int w, int h, String tz, long now) {
        c.drawColor(Palette.NIGHT);
        ClockText ct = ClockText.of(tz, now);
        TextPaint big = Draw.text(Fonts.serif, 140, Palette.NIGHT_TEXT);
        TextPaint suf = Draw.text(Fonts.sans, 28, Palette.NIGHT_TEXT);
        float tw = big.measureText(ct.time), sw = suf.measureText(ct.suffix);
        float x = (w - tw - sw - 12) / 2, y = h / 2f + 48;
        c.drawText(ct.time, x, y, big);
        c.drawText(ct.suffix, x + tw + 12, y, suf);
    }
}
