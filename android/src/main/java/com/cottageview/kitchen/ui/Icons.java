package com.cottageview.kitchen.ui;

import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;

/** Simple line icons for the sidebar, drawn in a square of side `s` centred on (cx, cy). */
final class Icons {
    private Icons() {}

    private static Paint line(int color, float s) {
        Paint p = Draw.stroke(color, Math.max(2f, s / 12f));
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);
        return p;
    }

    static void calendar(Canvas c, float cx, float cy, float s, int color) {
        Paint p = line(color, s);
        RectF r = new RectF(cx - s * 0.42f, cy - s * 0.34f, cx + s * 0.42f, cy + s * 0.42f);
        c.drawRoundRect(r, s * 0.08f, s * 0.08f, p);
        c.drawLine(r.left, cy - s * 0.12f, r.right, cy - s * 0.12f, p);
        c.drawLine(cx - s * 0.22f, cy - s * 0.46f, cx - s * 0.22f, cy - s * 0.26f, p);
        c.drawLine(cx + s * 0.22f, cy - s * 0.46f, cx + s * 0.22f, cy - s * 0.26f, p);
        Paint dot = Draw.fill(color);
        for (int row = 0; row < 2; row++) for (int col = 0; col < 3; col++) {
            c.drawCircle(cx - s * 0.2f + col * s * 0.2f, cy + s * 0.06f + row * s * 0.18f, s * 0.035f, dot);
        }
    }

    static void todo(Canvas c, float cx, float cy, float s, int color) {
        Paint p = line(color, s);
        RectF r = new RectF(cx - s * 0.36f, cy - s * 0.36f, cx + s * 0.36f, cy + s * 0.36f);
        c.drawRoundRect(r, s * 0.1f, s * 0.1f, p);
        Path tick = new Path();
        tick.moveTo(cx - s * 0.18f, cy + s * 0.02f);
        tick.lineTo(cx - s * 0.04f, cy + s * 0.16f);
        tick.lineTo(cx + s * 0.2f, cy - s * 0.14f);
        c.drawPath(tick, p);
    }

    static void bike(Canvas c, float cx, float cy, float s, int color) {
        Paint p = line(color, s);
        float r = s * 0.2f, by = cy + s * 0.14f;
        float lx = cx - s * 0.27f, rx = cx + s * 0.27f;
        c.drawCircle(lx, by, r, p);
        c.drawCircle(rx, by, r, p);
        Path frame = new Path();
        frame.moveTo(lx, by);
        frame.lineTo(cx - s * 0.06f, cy - s * 0.12f); // up to the seat tube
        frame.lineTo(cx + s * 0.16f, cy - s * 0.12f); // top tube
        frame.lineTo(rx, by);                          // down to the front wheel
        frame.moveTo(lx, by);
        frame.lineTo(cx, by);                          // chain stay
        frame.lineTo(cx + s * 0.16f, cy - s * 0.12f);
        frame.moveTo(cx - s * 0.06f, cy - s * 0.12f);
        frame.lineTo(cx, by);
        c.drawPath(frame, p);
        c.drawLine(cx - s * 0.14f, cy - s * 0.2f, cx + s * 0.0f, cy - s * 0.2f, p); // saddle
        c.drawLine(cx + s * 0.16f, cy - s * 0.12f, cx + s * 0.2f, cy - s * 0.26f, p); // stem
    }

    static void gear(Canvas c, float cx, float cy, float s, int color) {
        Paint p = line(color, s);
        c.drawCircle(cx, cy, s * 0.13f, p);
        c.drawCircle(cx, cy, s * 0.28f, p);
        for (int i = 0; i < 8; i++) {
            double a = Math.PI * i / 4;
            float x1 = cx + (float) Math.cos(a) * s * 0.30f, y1 = cy + (float) Math.sin(a) * s * 0.30f;
            float x2 = cx + (float) Math.cos(a) * s * 0.42f, y2 = cy + (float) Math.sin(a) * s * 0.42f;
            c.drawLine(x1, y1, x2, y2, p);
        }
    }

    static void messages(Canvas c, float cx, float cy, float s, int color) {
        Paint p = line(color, s);
        RectF r = new RectF(cx - s * 0.4f, cy - s * 0.32f, cx + s * 0.4f, cy + s * 0.2f);
        Path b = new Path();
        b.addRoundRect(r, s * 0.12f, s * 0.12f, Path.Direction.CW);
        c.drawPath(b, p);
        Path tail = new Path();
        tail.moveTo(cx - s * 0.18f, r.bottom);
        tail.lineTo(cx - s * 0.26f, cy + s * 0.4f);
        tail.lineTo(cx - s * 0.02f, r.bottom);
        c.drawPath(tail, p);
    }
}
