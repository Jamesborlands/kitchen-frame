package com.cottageview.kitchen.ui;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.text.TextPaint;
import com.cottageview.kitchen.core.CalendarGrid;
import com.cottageview.kitchen.core.CalendarPanelLayout;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.core.Keyboard;
import com.cottageview.kitchen.core.Layout;
import com.cottageview.kitchen.core.Panels;
import com.cottageview.kitchen.core.RouteLine;
import com.cottageview.kitchen.core.TileMath;
import com.cottageview.kitchen.core.TypingLayout;
import java.util.List;
import java.util.Locale;

/** The full calendar (month / week), typing a to-do, and a route's map — all drawn in a panel's body. */
final class ExtrasRenderer {
    private ExtrasRenderer() {}
    private static final String[] WEEKDAYS = { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" };

    static void button(Canvas c, Layout.Box b, String label, boolean on) {
        RectF r = Draw.rect(b);
        c.drawRoundRect(r, 16, 16, Draw.fill(on ? Palette.INK : Palette.CARD));
        if (!on) c.drawRoundRect(r, 16, 16, Draw.stroke(Palette.DIVIDER, 2));
        TextPaint p = Draw.text(Fonts.sans, 24, on ? Palette.PAPER : Palette.INK);
        c.drawText(label, r.centerX() - p.measureText(label) / 2, r.centerY() + 9, p);
    }

    // ---- the full calendar ----

    static void calendar(Canvas c, Layout.Box body, CalendarGrid g, List<Panels.AgendaDay> days, String today) {
        CalendarPanelLayout l = CalendarPanelLayout.compute(body, g.mode);
        button(c, l.previous, "‹", false);
        button(c, l.next, "›", false);
        button(c, l.today, "Today", false);
        button(c, l.month, "Month", g.mode == CalendarGrid.Mode.MONTH);
        button(c, l.week, "Week", g.mode == CalendarGrid.Mode.WEEK);

        TextPaint head = Draw.text(Fonts.sans, 17, Palette.MUTED);
        float cw = l.grid.w() / 7;
        if (g.mode == CalendarGrid.Mode.MONTH) {
            for (int i = 0; i < 7; i++) c.drawText(WEEKDAYS[i].toUpperCase(Locale.UK), l.grid.l + i * cw + 10, l.grid.t + 18, head);
        }
        for (int i = 0; i < l.cells.length; i++) {
            String date = g.dateAt(i);
            Panels.AgendaDay d = days == null ? null : find(days, date);
            if (g.mode == CalendarGrid.Mode.MONTH) monthCell(c, l.cells[i], date, d, g.inFocus(date), date.equals(today));
            else weekColumn(c, l.cells[i], date, d, WEEKDAYS[i], date.equals(today));
        }
        if (days == null) {
            TextPaint m = Draw.text(Fonts.sans, 20, Palette.MUTED);
            String s = "loading…";
            c.drawText(s, l.grid.r - m.measureText(s), body.t + 40, m);
        }
    }

    private static Panels.AgendaDay find(List<Panels.AgendaDay> days, String date) {
        for (Panels.AgendaDay d : days) if (d.date.equals(date)) return d;
        return null;
    }

    private static void monthCell(Canvas c, Layout.Box b, String date, Panels.AgendaDay d, boolean inMonth, boolean isToday) {
        RectF r = Draw.rect(b);
        c.drawRoundRect(r, 10, 10, Draw.fill(inMonth ? Palette.CARD : Palette.PAPER));
        if (isToday) c.drawRoundRect(r, 10, 10, Draw.stroke(Palette.SAGE, 3));
        TextPaint num = Draw.text(Fonts.sans, 20, inMonth ? (isToday ? Palette.SAGE : Palette.INK) : Palette.MUTED);
        c.drawText(String.valueOf(CalendarGrid.dayOfMonth(date)), r.left + 10, r.top + 24, num);
        if (d == null || d.items.isEmpty()) return;
        float y = r.top + 46, lineH = 21;
        int room = (int) ((r.bottom - y + 6) / lineH);
        TextPaint t = Draw.text(Fonts.sans, 16, inMonth ? Palette.INK : Palette.MUTED);
        for (int i = 0; i < d.items.size() && i < room; i++) {
            Feed.TodayItem it = d.items.get(i);
            boolean last = i == room - 1 && d.items.size() > room;
            if (last) { c.drawText("+" + (d.items.size() - i) + " more", r.left + 10, y, Draw.text(Fonts.sans, 15, Palette.MUTED)); break; }
            c.drawCircle(r.left + 14, y - 5, 5, Draw.fill(it.color));
            Draw.line(c, it.text, r.left + 24, y, r.width() - 30, t);
            y += lineH;
        }
    }

    private static void weekColumn(Canvas c, Layout.Box b, String date, Panels.AgendaDay d, String weekday, boolean isToday) {
        RectF r = Draw.rect(b);
        c.drawRoundRect(r, 12, 12, Draw.fill(Palette.CARD));
        if (isToday) c.drawRoundRect(r, 12, 12, Draw.stroke(Palette.SAGE, 3));
        c.drawText(weekday.toUpperCase(Locale.UK), r.left + 12, r.top + 24, Draw.text(Fonts.sans, 17, Palette.MUTED));
        c.drawText(String.valueOf(CalendarGrid.dayOfMonth(date)), r.left + 12, r.top + 62, Draw.text(Fonts.serif, 34, isToday ? Palette.SAGE : Palette.INK));
        if (d == null) return;
        float y = r.top + 96;
        for (Feed.TodayItem it : d.items) {
            if (y > r.bottom - 50) {
                c.drawText("+ more", r.left + 12, r.bottom - 14, Draw.text(Fonts.sans, 15, Palette.MUTED));
                break;
            }
            c.drawRect(r.left + 8, y - 16, r.left + 12, y + 30, Draw.fill(it.color));
            Draw.line(c, it.time, r.left + 18, y, r.width() - 26, Draw.text(Fonts.sans, 15, it.color));
            Draw.line(c, it.text, r.left + 18, y + 24, r.width() - 26, Draw.text(Fonts.sans, 18, Palette.INK));
            y += 62;
        }
    }

    // ---- adding a to-do ----

    static void typing(Canvas c, Layout.Box body, Keyboard kb, String text, long now) {
        TypingLayout l = TypingLayout.compute(body);
        RectF f = Draw.rect(l.field);
        c.drawRoundRect(f, 16, 16, Draw.fill(0xFFFFFFFF));
        c.drawRoundRect(f, 16, 16, Draw.stroke(Palette.SAGE, 3));
        TextPaint tp = Draw.text(Fonts.serif, 32, text.isEmpty() ? Palette.MUTED : Palette.INK);
        String shown = text.isEmpty() ? "Type the to-do…" : text;
        float maxW = f.width() - 40;
        while (!text.isEmpty() && tp.measureText(shown) > maxW && shown.length() > 1) shown = shown.substring(1); // keep the end in view
        c.drawText(shown, f.left + 20, f.centerY() + 11, tp);
        if (!text.isEmpty() && (now / 500) % 2 == 0) { // caret
            float x = f.left + 22 + tp.measureText(shown);
            c.drawLine(x, f.top + 16, x, f.bottom - 16, Draw.stroke(Palette.INK, 2));
        }
        button(c, l.add, "Add", !text.trim().isEmpty());
        button(c, l.cancel, "Cancel", false);
        for (Keyboard.Key k : kb.keys) {
            String label = k.label.equals("space") ? "space" : k.label.equals("back") ? "delete" : k.label.toUpperCase(Locale.UK);
            RectF r = Draw.rect(k.box);
            c.drawRoundRect(r, 14, 14, Draw.fill(Palette.CARD));
            c.drawRoundRect(r, 14, 14, Draw.stroke(Palette.DIVIDER, 2));
            TextPaint p = Draw.text(Fonts.sans, label.length() == 1 ? 34 : 24, Palette.INK);
            c.drawText(label, r.centerX() - p.measureText(label) / 2, r.centerY() + (label.length() == 1 ? 12 : 9), p);
        }
    }

    static void addButton(Canvas c, Layout.Box b) {
        RectF r = Draw.rect(b);
        c.drawRoundRect(r, 14, 14, Draw.fill(0xFFE9F0E6));
        c.drawRoundRect(r, 14, 14, Draw.stroke(Palette.SAGE, 2));
        TextPaint p = Draw.text(Fonts.sans, 24, 0xFF5E7E5E);
        String s = "+  Add a to-do";
        c.drawText(s, r.centerX() - p.measureText(s) / 2, r.centerY() + 9, p);
    }

    // ---- settings: the family page and where to send photos ----

    static void share(Canvas c, Layout.Box body, Feed.Share s) {
        if (s == null) {
            Draw.line(c, "loading…", body.l, body.t + 40, body.w(), Draw.text(Fonts.sans, 24, Palette.MUTED));
            return;
        }
        com.cottageview.kitchen.core.SharePanelLayout l = com.cottageview.kitchen.core.SharePanelLayout.compute(body);
        RectF q = Draw.rect(l.qr);
        c.drawRoundRect(q, 18, 18, Draw.fill(0xFFFFFFFF));
        int n = s.size();
        float quiet = 3, cell = (float) Math.floor(q.width() / (n + 2 * quiet));
        float ox = q.left + (q.width() - cell * n) / 2, oy = q.top + (q.height() - cell * n) / 2;
        Paint dark = new Paint();
        dark.setColor(0xFF000000);
        for (int r = 0; r < n; r++) for (int col = 0; col < n; col++) {
            if (s.dark(r, col)) c.drawRect(ox + col * cell, oy + r * cell, ox + (col + 1) * cell, oy + (r + 1) * cell, dark);
        }

        float x = l.text.l, w = l.text.w(), y = l.text.t + 10;
        TextPaint section = Draw.text(Fonts.sans, 18, Palette.MUTED);
        c.drawText("SEND PHOTOS & MESSAGES", x, y + 18, section);
        Draw.line(c, "on WhatsApp to", x, y + 62, w, Draw.text(Fonts.serif, 28, Palette.INK));
        Draw.line(c, s.whatsapp != null ? s.whatsapp : "(not set up yet)", x, y + 118, w, Draw.text(Fonts.serif, 48, s.whatsapp != null ? Palette.INK : Palette.MUTED));
        Draw.line(c, "They show up here within seconds.", x, y + 156, w, Draw.text(Fonts.sans, 20, Palette.MUTED));

        y += 220;
        c.drawText("THE FAMILY PAGE", x, y + 18, section);
        Draw.line(c, "Scan the code with a phone's camera, or go to", x, y + 62, w, Draw.text(Fonts.serif, 26, Palette.INK));
        Draw.line(c, s.urlLabel, x, y + 104, w, Draw.text(Fonts.sans, 26, 0xFF5E7E5E));
        Draw.line(c, "Add to-dos, reminders, calendars and birthdays,", x, y + 150, w, Draw.text(Fonts.sans, 20, Palette.MUTED));
        Draw.line(c, "see every photo, and change what's on the frame.", x, y + 178, w, Draw.text(Fonts.sans, 20, Palette.MUTED));

        button(c, l.wifi, "Wi-Fi settings", false);
        Draw.line(c, "new router or password? connect here", l.wifi.r + 20, l.wifi.t + (l.wifi.h() / 2) + 7, body.r - l.wifi.r - 20, Draw.text(Fonts.sans, 18, Palette.MUTED));
    }

    // ---- Wi-Fi ----

    static void wifiList(Canvas c, Layout.Box body, List<com.cottageview.kitchen.core.Wifi.Network> nets, String status) {
        int n = nets == null ? 0 : nets.size();
        com.cottageview.kitchen.core.WifiPanelLayout l = com.cottageview.kitchen.core.WifiPanelLayout.compute(body, n);
        button(c, l.rescan, "Look again", false);
        Draw.line(c, status != null ? status : "Tap a network to join it.", body.l, body.t + 40, l.rescan.l - body.l - 20,
            Draw.text(Fonts.sans, 24, status != null && status.startsWith("Couldn't") ? 0xFFB0504A : status != null && status.endsWith("✓") ? 0xFF5E7E5E : Palette.MUTED));
        if (n == 0) {
            Draw.line(c, "Looking for networks…", body.l, body.t + 130, body.w(), Draw.text(Fonts.serif, 28, Palette.MUTED));
            return;
        }
        for (int i = 0; i < l.rows.length; i++) {
            com.cottageview.kitchen.core.Wifi.Network w = nets.get(i);
            RectF r = Draw.rect(l.rows[i]);
            c.drawRoundRect(r, 12, 12, Draw.fill(w.connected ? 0xFFE9F0E6 : Palette.CARD));
            if (w.connected) c.drawRoundRect(r, 12, 12, Draw.stroke(0xFF5E7E5E, 2));
            int bars = com.cottageview.kitchen.core.Wifi.bars(w.level);
            for (int k = 0; k < 4; k++) {
                float bx = r.left + 18 + k * 9, bh = 8 + k * 7;
                c.drawRect(bx, r.centerY() + 12 - bh, bx + 6, r.centerY() + 12, Draw.fill(k < bars ? Palette.INK : Palette.DIVIDER));
            }
            Draw.line(c, w.ssid, r.left + 70, r.centerY() + 10, r.width() - 300, Draw.text(Fonts.serif, 28, Palette.INK));
            String right = w.connected ? "connected" : w.saved ? "saved — tap to join" : w.needsPassword() ? "password" : "open";
            TextPaint rp = Draw.text(Fonts.sans, 18, w.connected ? 0xFF5E7E5E : Palette.MUTED);
            c.drawText(right, r.right - 20 - rp.measureText(right), r.centerY() + 7, rp);
        }
    }

    static void password(Canvas c, Layout.Box body, String text, Keyboard.Page page) {
        TypingLayout l = TypingLayout.compute(body);
        RectF f = Draw.rect(l.field);
        c.drawRoundRect(f, 16, 16, Draw.fill(0xFFFFFFFF));
        c.drawRoundRect(f, 16, 16, Draw.stroke(Palette.SAGE, 3));
        TextPaint tp = Draw.text(Fonts.sans, 30, text.isEmpty() ? Palette.MUTED : Palette.INK);
        String shown = text.isEmpty() ? "Type the Wi-Fi password" : text;
        while (!text.isEmpty() && tp.measureText(shown) > f.width() - 40 && shown.length() > 1) shown = shown.substring(1);
        c.drawText(shown, f.left + 20, f.centerY() + 11, tp);
        button(c, l.add, "Connect", !text.isEmpty());
        button(c, l.cancel, "Cancel", false);
        Keyboard kb = Keyboard.layout(l.keys, page);
        for (Keyboard.Key k : kb.keys) {
            String label = k.label.equals("back") ? "delete" : k.label.equals("shift") ? (page == Keyboard.Page.CAPITALS ? "abc" : "ABC") : k.label;
            boolean on = k.label.equals("shift") && page == Keyboard.Page.CAPITALS;
            RectF r = Draw.rect(k.box);
            c.drawRoundRect(r, 14, 14, Draw.fill(on ? Palette.INK : Palette.CARD));
            c.drawRoundRect(r, 14, 14, Draw.stroke(Palette.DIVIDER, 2));
            TextPaint p = Draw.text(Fonts.sans, label.length() == 1 ? 32 : 24, on ? Palette.PAPER : Palette.INK);
            c.drawText(label, r.centerX() - p.measureText(label) / 2, r.centerY() + (label.length() == 1 ? 11 : 9), p);
        }
    }

    // ---- a route on the map ----

    interface Tiles { Bitmap tile(String url); }

    static void map(Canvas c, Layout.Box back, Layout.Box box, RouteLine route, Tiles tiles) {
        button(c, back, "‹ Back", false);
        RectF frame = Draw.rect(box);
        c.save();
        c.clipRect(frame);
        c.drawColor(0xFFE8E4DA);
        if (route == null) {
            TextPaint m = Draw.text(Fonts.sans, 24, Palette.MUTED);
            c.drawText("loading the map…", frame.left + 30, frame.top + 50, m);
            c.restore();
            return;
        }
        TileMath.View v = TileMath.fit(route.south, route.west, route.north, route.east, (int) box.w(), (int) box.h());
        Paint smooth = new Paint(Paint.FILTER_BITMAP_FLAG);
        for (int[] t : v.tiles()) {
            float[] at = v.tileOrigin(t[1], t[2]);
            Bitmap bm = tiles.tile("/api/kitchen/tile?z=" + t[0] + "&x=" + t[1] + "&y=" + t[2]);
            if (bm != null) c.drawBitmap(bm, null, new RectF(box.l + at[0], box.t + at[1], box.l + at[0] + TileMath.TILE, box.t + at[1] + TileMath.TILE), smooth);
        }
        Path p = new Path();
        for (int i = 0; i < route.lat.length; i++) {
            float[] s = v.toScreen(route.lat[i], route.lon[i]);
            if (i == 0) p.moveTo(box.l + s[0], box.t + s[1]); else p.lineTo(box.l + s[0], box.t + s[1]);
        }
        Paint casing = Draw.stroke(0xFFFFFFFF, 11), line = Draw.stroke(0xFFC0503A, 6);
        for (Paint q : new Paint[] { casing, line }) { q.setStrokeCap(Paint.Cap.ROUND); q.setStrokeJoin(Paint.Join.ROUND); q.setAntiAlias(true); c.drawPath(p, q); }
        float[] a = v.toScreen(route.lat[0], route.lon[0]), z = v.toScreen(route.lat[route.lat.length - 1], route.lon[route.lon.length - 1]);
        dot(c, box.l + z[0], box.t + z[1], 0xFF4E6A8E);
        dot(c, box.l + a[0], box.t + a[1], 0xFF5E7E5E);

        String info = route.name + "  ·  " + String.format(Locale.UK, "%.1f km", route.distanceKm) + (route.ascentM > 0 ? "  ·  " + route.ascentM + " m climb" : "");
        TextPaint ip = Draw.text(Fonts.sans, 22, Palette.INK);
        RectF card = new RectF(frame.left + 16, frame.bottom - 64, frame.left + 16 + ip.measureText(info) + 40, frame.bottom - 16);
        c.drawRoundRect(card, 12, 12, Draw.fill(0xEEFFFFFF));
        c.drawText(info, card.left + 20, card.centerY() + 8, ip);
        TextPaint attr = Draw.text(Fonts.sans, 13, Palette.INK);
        String credit = "© OpenStreetMap contributors";
        float cwid = attr.measureText(credit);
        c.drawRect(frame.right - cwid - 16, frame.bottom - 24, frame.right, frame.bottom, Draw.fill(0xCCFFFFFF));
        c.drawText(credit, frame.right - cwid - 8, frame.bottom - 7, attr);
        c.restore();
    }

    private static void dot(Canvas c, float x, float y, int color) {
        c.drawCircle(x, y, 13, Draw.fill(0xFFFFFFFF));
        c.drawCircle(x, y, 9, Draw.fill(color));
    }
}
