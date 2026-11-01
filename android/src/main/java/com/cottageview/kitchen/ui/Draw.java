package com.cottageview.kitchen.ui;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.BitmapShader;
import android.graphics.Matrix;
import android.graphics.Shader;
import android.graphics.RectF;
import android.text.TextPaint;
import android.text.TextUtils;
import com.cottageview.kitchen.core.Layout;

/** Small drawing helpers shared by the renderers. */
final class Draw {
    private Draw() {}

    static RectF rect(Layout.Box b) { return new RectF(b.l, b.t, b.r, b.b); }

    static Paint fill(int color) { Paint p = new Paint(Paint.ANTI_ALIAS_FLAG); p.setColor(color); return p; }

    static Paint stroke(int color, float width) {
        Paint p = fill(color); p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(width); return p;
    }

    static TextPaint text(android.graphics.Typeface tf, float size, int color) {
        TextPaint p = new TextPaint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        p.setTypeface(tf); p.setTextSize(size); p.setColor(color);
        return p;
    }

    /**
     * Draw a bitmap center-cropped into r with rounded corners. Uses a BitmapShader +
     * drawRoundRect: on Android 4.4 a clipPath goes through the stencil buffer and is
     * far slower to replay every frame.
     */
    static void imageCover(Canvas c, Bitmap bmp, RectF r, float radius, int alpha) {
        if (bmp == null) return;
        float s = Math.max(r.width() / bmp.getWidth(), r.height() / bmp.getHeight());
        float dx = r.left + (r.width() - bmp.getWidth() * s) / 2, dy = r.top + (r.height() - bmp.getHeight() * s) / 2;
        roundImage(c, bmp, s, dx, dy, r, radius, alpha);
    }

    /** Draw a bitmap whole (letterboxed) centred in r, with its own corners rounded. */
    static void imageContain(Canvas c, Bitmap bmp, RectF r, float radius, int alpha) {
        if (bmp == null) return;
        float s = Math.min(r.width() / bmp.getWidth(), r.height() / bmp.getHeight());
        float dw = bmp.getWidth() * s, dh = bmp.getHeight() * s;
        RectF dst = new RectF(r.centerX() - dw / 2, r.centerY() - dh / 2, r.centerX() + dw / 2, r.centerY() + dh / 2);
        roundImage(c, bmp, s, dst.left, dst.top, dst, radius, alpha);
    }

    private static void roundImage(Canvas c, Bitmap bmp, float scale, float dx, float dy, RectF shape, float radius, int alpha) {
        BitmapShader shader = new BitmapShader(bmp, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
        Matrix m = new Matrix();
        m.setScale(scale, scale);
        m.postTranslate(dx, dy);
        shader.setLocalMatrix(m);
        Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG);
        paint.setShader(shader);
        paint.setAlpha(alpha);
        c.drawRoundRect(shape, radius, radius, paint);
    }

    /** Single line, ellipsized to width. */
    static void line(Canvas c, String s, float x, float y, float maxW, TextPaint p) {
        if (s == null) return;
        c.drawText(TextUtils.ellipsize(s, p, maxW, TextUtils.TruncateAt.END).toString(), x, y, p);
    }

    static void lineRight(Canvas c, String s, float right, float y, float maxW, TextPaint p) {
        if (s == null) return;
        String t = TextUtils.ellipsize(s, p, maxW, TextUtils.TruncateAt.END).toString();
        c.drawText(t, right - p.measureText(t), y, p);
    }

    /** Text with extra tracking between letters (setLetterSpacing is API 21; the frame is 19). */
    static void spaced(Canvas c, String s, float x, float y, float tracking, TextPaint p) {
        for (int i = 0; i < s.length(); i++) {
            String ch = String.valueOf(s.charAt(i));
            c.drawText(ch, x, y, p);
            x += p.measureText(ch) + tracking;
        }
    }

    /** A small crescent moon (the "asleep there" cue). */
    static void moon(Canvas c, float cx, float cy, float r, int color, int bg) {
        c.drawCircle(cx, cy, r, fill(color));
        c.drawCircle(cx + r * 0.45f, cy - r * 0.3f, r * 0.85f, fill(bg));
    }

    /** A circular initials badge. */
    static void badge(Canvas c, String initials, float cx, float cy, float r) {
        c.drawCircle(cx, cy, r, fill(Palette.SAGE));
        TextPaint t = text(Fonts.sans, r * 0.72f, 0xF5F8F5F0);
        float w = t.measureText(initials);
        c.drawText(initials, cx - w / 2, cy + t.getTextSize() * 0.36f, t);
    }
}
