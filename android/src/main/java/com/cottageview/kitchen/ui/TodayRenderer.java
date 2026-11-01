package com.cottageview.kitchen.ui;

import android.graphics.Canvas;
import android.graphics.RectF;
import android.text.TextPaint;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.core.Layout;
import com.cottageview.kitchen.core.Rotator;
import com.cottageview.kitchen.core.Todos;
import java.util.List;
import java.util.Locale;

/**
 * "Happening today" in the bottom-left card: the day, up to three things on it
 * (reminders, calendar, birthdays) and, when there's room, one rotating gentle
 * tip. A quiet day says so and shows tomorrow's first thing. Tap → Today panel.
 */
final class TodayRenderer {
    static final float LINE = 30;

    /** @return true while a tip is crossfading (not used: tips swap instantly) */
    boolean draw(Canvas c, Layout.Box box, Feed feed, Rotator.State tip) {
        RectF r = Draw.rect(box);
        c.drawRoundRect(r, 16, 16, Draw.fill(Palette.CARD));
        c.drawRoundRect(r, 16, 16, Draw.stroke(Palette.DIVIDER, 1));
        Feed.Today t = feed.today;
        float x = r.left + 20, w = r.width() - 40;

        TextPaint eyebrow = Draw.text(Fonts.sans, 13, Palette.MUTED);
        Draw.spaced(c, ("today · " + t.label).toUpperCase(Locale.UK), x, r.top + 28, 1.2f, eyebrow);
        int open = Todos.open(feed.todos);
        if (open > 0) {
            TextPaint chip = Draw.text(Fonts.sans, 14, Palette.SAGE);
            String s = "TO-DO " + open + " ›";
            c.drawText(s, r.right - 20 - chip.measureText(s), r.top + 28, chip);
        }

        float y = r.top + 62;
        int maxLines = 3;
        List<Feed.TodayItem> items = t.items;
        if (items.isEmpty()) {
            Draw.line(c, "Nothing on today.", x, y, w, Draw.text(Fonts.serif, 23, Palette.MUTED));
            y += LINE;
            maxLines--;
            if (!t.tomorrow.isEmpty()) {
                Feed.TodayItem n = t.tomorrow.get(0);
                row(c, x, y, w, "Tomorrow", n.time.equals("all day") ? n.text : n.time + "  " + n.text, n.color);
                y += LINE;
                maxLines--;
            }
        } else {
            boolean more = items.size() > maxLines;
            int shown = more ? maxLines - 1 : Math.min(items.size(), maxLines);
            for (int i = 0; i < shown; i++) {
                Feed.TodayItem it = items.get(i);
                row(c, x, y, w, it.time, it.text, it.color);
                y += LINE;
            }
            if (more) {
                Draw.line(c, "+" + (items.size() - shown) + " more — tap to see", x + 116, y, w - 116, Draw.text(Fonts.sans, 16, Palette.MUTED));
                y += LINE;
            }
            maxLines -= shown + (more ? 1 : 0);
        }

        // room left: one gentle tip (weather advice, sky, a poem…), rotating
        if (maxLines > 0 && !feed.tips.isEmpty() && tip != null) {
            Feed.Notice n = feed.tips.get(Math.min(tip.index, feed.tips.size() - 1));
            float ty = r.bottom - 18;
            TextPaint lab = Draw.text(Fonts.sans, 15, n.color), body = Draw.text(Fonts.sans, 15, Palette.MUTED);
            String label = n.eyebrow.toLowerCase(Locale.UK) + " · ";
            c.drawText(label, x, ty, lab);
            Draw.line(c, n.headline, x + lab.measureText(label), ty, w - lab.measureText(label), body);
        }
        return false;
    }

    private static void row(Canvas c, float x, float y, float w, String time, String text, int color) {
        c.drawCircle(x + 5, y - 7, 5, Draw.fill(color));
        TextPaint tp = Draw.text(Fonts.sans, 17, color);
        Draw.line(c, time, x + 18, y, 92, tp);
        Draw.line(c, text, x + 116, y, w - 116, Draw.text(Fonts.serif, 22, Palette.INK));
    }
}
