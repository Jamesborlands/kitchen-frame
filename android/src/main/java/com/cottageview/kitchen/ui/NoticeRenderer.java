package com.cottageview.kitchen.ui;

import android.graphics.Canvas;
import android.graphics.Path;
import android.graphics.RectF;
import android.text.Layout.Alignment;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.text.TextUtils;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.core.Layout;
import com.cottageview.kitchen.core.Rotator;

/** "Worth noticing" — one editorial card at a time, fading between cards (components/NoticeBoard.tsx). */
final class NoticeRenderer {
    static final long FADE_MS = 600;

    /** @return true while a fade is running (keep animating) */
    boolean draw(Canvas c, Layout.Box box, Feed feed, Rotator.State s) {
        RectF r = Draw.rect(box);
        c.drawRoundRect(r, 12, 12, Draw.fill(Palette.CARD));
        c.drawRoundRect(r, 12, 12, Draw.stroke(Palette.DIVIDER, 1));
        if (feed.notices.isEmpty()) return false;
        Feed.Notice n = feed.notices.get(s.index);
        boolean fading = s.sinceSwitchMs < FADE_MS && feed.notices.size() > 1;
        int alpha = fading ? (int) (255 * s.sinceSwitchMs / FADE_MS) : 255;
        c.saveLayerAlpha(r, alpha, Canvas.ALL_SAVE_FLAG);

        float cx = r.left + 16 + 20, cy = r.top + 16 + 20;
        c.drawCircle(cx, cy, 20, Draw.fill((n.color & 0x00FFFFFF) | 0x21000000));
        sparkle(c, cx, cy, 8, n.color);

        float x = r.left + 16 + 40 + 12, w = r.right - 16 - x;
        Draw.line(c, n.eyebrow.toUpperCase(java.util.Locale.UK), x, r.top + 24, w, eyebrow(n.color));
        StaticLayout sl = headline(n, (int) w, r.bottom - 8 - (r.top + 30));
        c.save();
        c.translate(x, r.top + 30);
        sl.draw(c);
        c.restore();
        if (n.detail != null && sl.getLineCount() == 1) {
            Draw.line(c, n.detail, x, r.top + 30 + sl.getHeight() + 14, w, Draw.text(Fonts.sans, 13, Palette.MUTED));
        }
        c.restore();
        return fading;
    }

    private final TextPaint head = Draw.text(Fonts.serif, 18, Palette.INK);
    private TextPaint eyebrowPaint;
    private String cachedFor;
    private StaticLayout cached;

    private TextPaint eyebrow(int color) {
        if (eyebrowPaint == null) eyebrowPaint = Draw.text(Fonts.sans, 11, color);
        eyebrowPaint.setColor(color);
        return eyebrowPaint;
    }

    /** The headline wrapped to the card, cut to the lines that fit with "…" on the last (StaticLayout maxLines is API 23). */
    private StaticLayout headline(Feed.Notice n, int w, float availH) {
        String key = n.id + "/" + w + "/" + (int) availH;
        if (key.equals(cachedFor)) return cached;
        head.setTypeface(Fonts.serif);
        StaticLayout sl = new StaticLayout(n.headline, head, w, Alignment.ALIGN_NORMAL, 1f, 0, false);
        int lineH = sl.getLineCount() > 0 ? sl.getLineBottom(0) - sl.getLineTop(0) : 1;
        int maxLines = Math.max(1, (int) (availH / lineH));
        if (sl.getLineCount() > maxLines) {
            int start = sl.getLineStart(maxLines - 1);
            CharSequence last = TextUtils.ellipsize(n.headline.substring(start), head, w, TextUtils.TruncateAt.END);
            sl = new StaticLayout(n.headline.substring(0, start) + last, head, w, Alignment.ALIGN_NORMAL, 1f, 0, false);
        }
        cachedFor = key;
        cached = sl;
        return sl;
    }

    private static void sparkle(Canvas c, float cx, float cy, float s, int color) {
        Path p = new Path();
        p.moveTo(cx, cy - s);
        p.lineTo(cx + s * 0.3f, cy - s * 0.3f);
        p.lineTo(cx + s, cy);
        p.lineTo(cx + s * 0.3f, cy + s * 0.3f);
        p.lineTo(cx, cy + s);
        p.lineTo(cx - s * 0.3f, cy + s * 0.3f);
        p.lineTo(cx - s, cy);
        p.lineTo(cx - s * 0.3f, cy - s * 0.3f);
        p.close();
        c.drawPath(p, Draw.stroke(color, 1.4f));
    }
}
