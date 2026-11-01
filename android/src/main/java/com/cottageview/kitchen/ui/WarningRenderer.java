package com.cottageview.kitchen.ui;

import android.graphics.Canvas;
import android.graphics.RectF;
import android.text.TextPaint;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.core.Layout;

/** Met Office warning banner (components/WarningBanner.tsx). */
final class WarningRenderer {
    void draw(Canvas c, Layout.Box box, Feed.Warning w) {
        RectF r = Draw.rect(box);
        c.drawRoundRect(r, 12, 12, Draw.fill(w.bg));
        c.drawCircle(r.left + 18, r.centerY(), 4, Draw.fill(w.dot));
        TextPaint title = Draw.text(Fonts.sans, 14, w.fg);
        title.setFakeBoldText(true);
        float x = r.left + 32, y = r.centerY() + 5;
        c.drawText(w.title, x, y, title);
        x += title.measureText(w.title);
        TextPaint rest = Draw.text(Fonts.sans, 14, (w.fg & 0x00FFFFFF) | 0xCC000000);
        Draw.line(c, " · " + w.detail, x, y, r.right - x - 16, rest);
    }
}
