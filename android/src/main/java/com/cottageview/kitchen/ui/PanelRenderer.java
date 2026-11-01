package com.cottageview.kitchen.ui;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.RectF;
import android.text.Layout.Alignment;
import android.text.StaticLayout;
import android.text.TextPaint;
import com.cottageview.kitchen.core.Ago;
import com.cottageview.kitchen.core.CallHint;
import com.cottageview.kitchen.core.ClockText;
import com.cottageview.kitchen.core.Layout;
import com.cottageview.kitchen.core.PanelLayout;
import com.cottageview.kitchen.core.Panels;
import com.cottageview.kitchen.core.TodayPanelLayout;
import com.cottageview.kitchen.core.Feed;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * The tap-to-open panels (components/kitchen/*Panel.tsx): the weather, a family
 * place, and the messages. Everything worded by the server (/api/kitchen/panels);
 * this only lays it out, big enough to read across a kitchen.
 */
final class PanelRenderer {
    static final int BLUE = 0xFF4E6A8E;

    interface Icons { Bitmap icon(String url); Bitmap scene(String url); }

    void draw(Canvas c, int w, int h, KitchenView.OpenPanel open, Panels data, Feed feed, Icons icons, long now, ExtrasState ex) {
        c.drawColor(0x8C1C1917); // dim the kitchen behind
        PanelLayout p = PanelLayout.compute(w, h);
        RectF card = Draw.rect(p.card);
        c.drawRoundRect(card, 24, 24, Draw.fill(Palette.PAPER));
        // the ×
        RectF x = Draw.rect(p.close);
        c.drawCircle(x.centerX(), x.centerY(), x.width() / 2, Draw.fill(Palette.CARD));
        c.drawCircle(x.centerX(), x.centerY(), x.width() / 2, Draw.stroke(Palette.DIVIDER, 2));
        android.graphics.Paint cross = Draw.stroke(Palette.INK, 4);
        cross.setStrokeCap(android.graphics.Paint.Cap.ROUND);
        float k = x.width() * 0.2f;
        c.drawLine(x.centerX() - k, x.centerY() - k, x.centerX() + k, x.centerY() + k, cross);
        c.drawLine(x.centerX() + k, x.centerY() - k, x.centerX() - k, x.centerY() + k, cross);

        Panels.Place place = open.kind == KitchenView.OpenPanel.Kind.PLACE && data != null ? data.place(open.placeKey) : null;
        String title = open.kind == KitchenView.OpenPanel.Kind.WEATHER ? "weather in ludlow"
            : open.kind == KitchenView.OpenPanel.Kind.MESSAGES ? "messages from the family"
            : open.kind == KitchenView.OpenPanel.Kind.TODAY ? (ex.typing ? "add a to-do" : "today" + (feed != null && feed.today != null ? " · " + feed.today.label.toLowerCase(Locale.UK) : ""))
            : open.kind == KitchenView.OpenPanel.Kind.RIDES ? (ex.routeId >= 0 && ex.route != null ? ex.route.name.toLowerCase(Locale.UK) : "rides & walks")
            : open.kind == KitchenView.OpenPanel.Kind.SETTINGS ? "settings"
            : open.kind == KitchenView.OpenPanel.Kind.WIFI ? (ex.wifiPick != null ? "password for " + ex.wifiPick.ssid : "wi-fi")
            : open.kind == KitchenView.OpenPanel.Kind.CALENDAR ? (ex.grid != null ? ex.grid.title.toLowerCase(Locale.UK) : "calendar")
            : place != null ? place.label.toLowerCase(Locale.UK) : open.placeLabel.toLowerCase(Locale.UK);
        Draw.line(c, title, p.titleX, p.titleBaseline, p.close.l - p.titleX - 20, Draw.text(Fonts.serif, 40, Palette.INK));

        if (open.kind == KitchenView.OpenPanel.Kind.TODAY) { // drawn from the feed: no panel data needed
            if (ex.typing) ExtrasRenderer.typing(c, p.body, ex.keyboard, ex.typed.value(), now);
            else if (feed != null) today(c, p.body, feed);
            return;
        }
        if (open.kind == KitchenView.OpenPanel.Kind.WIFI) {
            if (ex.wifiPick != null) ExtrasRenderer.password(c, p.body, ex.wifiTyped.value(), ex.wifiPage);
            else ExtrasRenderer.wifiList(c, p.body, ex.wifiNetworks, ex.wifiStatus);
            return;
        }
        if (open.kind == KitchenView.OpenPanel.Kind.SETTINGS) { // from the feed
            ExtrasRenderer.share(c, p.body, feed == null ? null : feed.share);
            return;
        }
        if (open.kind == KitchenView.OpenPanel.Kind.CALENDAR && ex.grid != null) { // fetched page by page
            ExtrasRenderer.calendar(c, p.body, ex.grid, ex.gridDays, ex.today);
            return;
        }
        if (open.kind == KitchenView.OpenPanel.Kind.RIDES && ex.routeId >= 0) {
            com.cottageview.kitchen.core.RidesPanelLayout rl = com.cottageview.kitchen.core.RidesPanelLayout.compute(p.body, 0);
            ExtrasRenderer.map(c, rl.back, rl.map, ex.route, ex.tiles);
            return;
        }
        if (data == null) {
            Draw.line(c, "loading…", p.body.l, p.body.t + 40, p.body.w(), Draw.text(Fonts.sans, 26, Palette.MUTED));
            return;
        }
        switch (open.kind) {
            case WEATHER: weather(c, p.body, data, icons); break;
            case PLACE:
                if (place == null) Draw.line(c, "couldn't load this just now — try again in a bit", p.body.l, p.body.t + 40, p.body.w(), Draw.text(Fonts.sans, 24, Palette.MUTED));
                else place(c, p.body, place, icons, now);
                break;
            case MESSAGES: messages(c, p.body, data.notes, now); break;
            case CALENDAR: agenda(c, p.body, data.calendar); break;
            case RIDES:
                if (data.rides == null) Draw.line(c, "couldn't load this just now — try again in a bit", p.body.l, p.body.t + 40, p.body.w(), Draw.text(Fonts.sans, 24, Palette.MUTED));
                else rides(c, p.body, data.rides);
                break;
            default: break;
        }
    }

    // ---- weather: the next hours and the week ----

    private void weather(Canvas c, Layout.Box b, Panels d, Icons icons) {
        TextPaint section = Draw.text(Fonts.sans, 18, Palette.MUTED);
        float y = b.t;
        c.drawText("THE NEXT FEW HOURS", b.l, y + 18, section);
        y += 34;
        if (d.hours.isEmpty()) {
            Draw.line(c, "no forecast just now", b.l, y + 30, b.w(), Draw.text(Fonts.sans, 22, Palette.MUTED));
        } else {
            int n = Math.min(d.hours.size(), (int) (b.w() / 70));
            float cw = b.w() / n;
            TextPaint label = Draw.text(Fonts.sans, 18, Palette.MUTED), temp = Draw.text(Fonts.sans, 24, Palette.INK), rain = Draw.text(Fonts.sans, 17, BLUE);
            for (int i = 0; i < n; i++) {
                Panels.Hour h = d.hours.get(i);
                float cx = b.l + cw * i + cw / 2;
                centred(c, h.label, cx, y + 20, label);
                icon(c, icons, h.icon, cx, y + 58, 22);
                centred(c, h.tempC + "°", cx, y + 112, temp);
                if (h.rainPct >= 0) centred(c, h.rainPct + "%", cx, y + 138, rain);
            }
        }
        y += 170;
        c.drawText("THE WEEK AHEAD", b.l, y + 18, section);
        y += 34;
        week(c, new Layout.Box(b.l, y, b.r, Math.min(b.b, y + 210)), d.days, icons, 30);
    }

    private void week(Canvas c, Layout.Box b, List<Panels.Day> days, Icons icons, float iconR) {
        if (days.isEmpty()) return;
        float cw = b.w() / days.size();
        TextPaint label = Draw.text(Fonts.sans, 20, Palette.INK), max = Draw.text(Fonts.sans, 24, Palette.INK), min = Draw.text(Fonts.sans, 20, Palette.MUTED);
        for (int i = 0; i < days.size(); i++) {
            Panels.Day d = days.get(i);
            RectF r = new RectF(b.l + cw * i + 4, b.t, b.l + cw * (i + 1) - 4, b.b);
            c.drawRoundRect(r, 16, 16, Draw.fill(Palette.CARD));
            float cx = r.centerX();
            centred(c, d.label, cx, r.top + 30, label);
            icon(c, icons, d.icon, cx, r.top + 40 + iconR + 8, iconR);
            float ty = r.top + 40 + iconR * 2 + 48;
            String hi = d.maxC + "°", lo = "  " + d.minC + "°";
            float tw = max.measureText(hi) + min.measureText(lo);
            c.drawText(hi, cx - tw / 2, ty, max);
            c.drawText(lo, cx - tw / 2 + max.measureText(hi), ty, min);
        }
    }

    // ---- a family place ----

    private void place(Canvas c, Layout.Box b, Panels.Place p, Icons icons, long now) {
        float leftW = Math.min(b.w() * 0.42f, 520);
        // left: the watercolour and who's there
        RectF scene = new RectF(b.l, b.t, b.l + leftW, b.t + leftW * 0.75f);
        c.drawRoundRect(scene, 20, 20, Draw.fill(0x66D4E4EE));
        Bitmap img = p.sceneUrl == null ? null : icons.scene(p.sceneUrl);
        if (img != null) Draw.imageCover(c, img, scene, 20, 255);
        Draw.line(c, p.label, b.l, scene.bottom + 46, leftW, Draw.text(Fonts.serif, 38, Palette.INK));
        Draw.line(c, p.sublabel, b.l, scene.bottom + 80, leftW, Draw.text(Fonts.sans, 22, Palette.MUTED));

        // right: now, weather, extra, the week
        float rl = b.l + leftW + 28, rw = b.r - rl;
        float half = (rw - 16) / 2;
        RectF nowCard = new RectF(rl, b.t, rl + half, b.t + 170);
        RectF wxCard = new RectF(rl + half + 16, b.t, b.r, b.t + 170);
        c.drawRoundRect(nowCard, 16, 16, Draw.fill(Palette.CARD));
        c.drawRoundRect(wxCard, 16, 16, Draw.fill(Palette.CARD));

        TextPaint section = Draw.text(Fonts.sans, 16, Palette.MUTED);
        ClockText t = ClockText.of(p.timeZone, now);
        c.drawText("NOW", nowCard.left + 20, nowCard.top + 32, section);
        TextPaint big = Draw.text(Fonts.serif, 52, Palette.INK);
        c.drawText(t.time, nowCard.left + 20, nowCard.top + 92, big);
        c.drawText(t.suffix, nowCard.left + 28 + big.measureText(t.time), nowCard.top + 92, Draw.text(Fonts.serif, 26, Palette.MUTED));
        Draw.line(c, weekday(p.timeZone, now) + " · " + CallHint.forHour(t.hour24), nowCard.left + 20, nowCard.top + 136, nowCard.width() - 40, Draw.text(Fonts.sans, 20, Palette.MUTED));

        c.drawText("WEATHER", wxCard.left + 20, wxCard.top + 32, section);
        if (p.now == null) {
            Draw.line(c, "no weather just now", wxCard.left + 20, wxCard.top + 92, wxCard.width() - 40, Draw.text(Fonts.sans, 22, Palette.MUTED));
        } else {
            icon(c, icons, p.now.icon, wxCard.left + 46, wxCard.top + 76, 26);
            c.drawText(p.now.tempC + "°", wxCard.left + 86, wxCard.top + 92, big);
            Draw.line(c, p.now.condition, wxCard.left + 86 + big.measureText(p.now.tempC + "° "), wxCard.top + 88, wxCard.right - wxCard.left - 200, Draw.text(Fonts.sans, 20, Palette.INK));
            TextPaint small = Draw.text(Fonts.sans, 18, Palette.MUTED);
            Draw.line(c, "feels " + p.now.feelsC + "° · UV " + p.now.uv, wxCard.left + 20, wxCard.top + 126, wxCard.width() - 40, small);
            Draw.line(c, "↑ " + p.now.sunrise + " · ↓ " + p.now.sunset, wxCard.left + 20, wxCard.top + 152, wxCard.width() - 40, small);
        }

        float y = b.t + 186;
        if (p.extraTitle != null && !p.extraLines.isEmpty()) {
            float eh = 52 + p.extraLines.size() * 32;
            RectF extra = new RectF(rl, y, b.r, y + eh);
            c.drawRoundRect(extra, 16, 16, Draw.fill(Palette.CARD));
            c.drawText(p.extraTitle.toUpperCase(Locale.UK), extra.left + 20, extra.top + 32, section);
            TextPaint line = Draw.text(Fonts.sans, 22, Palette.INK);
            for (int i = 0; i < p.extraLines.size(); i++) {
                Draw.line(c, p.extraLines.get(i), extra.left + 20, extra.top + 66 + i * 32, extra.width() - 40, line);
            }
            y = extra.bottom + 16;
        }
        c.drawText("NEXT 7 DAYS", rl, y + 20, section);
        week(c, new Layout.Box(rl, y + 32, b.r, Math.min(b.b, y + 32 + 190)), p.days, icons, 24);
    }

    private static String weekday(String tz, long now) {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone(tz), Locale.UK);
        cal.setTimeInMillis(now);
        return cal.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.UK).toLowerCase(Locale.UK);
    }

    // ---- the messages ----

    private void messages(Canvas c, Layout.Box b, List<Panels.Note> notes, long now) {
        if (notes.isEmpty()) {
            Draw.line(c, "no messages in the last day.", b.l, b.t + 40, b.w(), Draw.text(Fonts.serif, 28, Palette.MUTED));
            return;
        }
        float gap = 16, cw = (b.w() - gap) / 2, chMax = (b.h() - gap * 2) / 3;
        TextPaint text = Draw.text(Fonts.serif, 28, Palette.INK), meta = Draw.text(Fonts.sans, 18, Palette.MUTED);
        float[] colY = { b.t, b.t };
        for (int i = 0; i < notes.size(); i++) {
            int col = colY[0] <= colY[1] ? 0 : 1;
            Panels.Note n = notes.get(i);
            StaticLayout sl = new StaticLayout(n.text, text, (int) (cw - 48), Alignment.ALIGN_NORMAL, 1.1f, 0, false);
            float ch = Math.min(chMax, sl.getHeight() + 84);
            if (colY[col] + ch > b.b) break;
            RectF r = new RectF(b.l + col * (cw + gap), colY[col], b.l + col * (cw + gap) + cw, colY[col] + ch);
            c.drawRoundRect(r, 16, 16, Draw.fill(Palette.CARD));
            c.save();
            c.clipRect(r.left, r.top, r.right, r.bottom - 48);
            c.translate(r.left + 24, r.top + 20);
            sl.draw(c);
            c.restore();
            Draw.line(c, n.from + " · " + Ago.of(n.at, now), r.left + 24, r.bottom - 20, r.width() - 48, meta);
            colY[col] = r.bottom + gap;
        }
    }

    // ---- today: the day, tomorrow, and the to-do list (tap a row to tick it) ----

    private void today(Canvas c, Layout.Box b, Feed feed) {
        TodayPanelLayout l = TodayPanelLayout.compute(b, feed.todos.size());
        TextPaint section = Draw.text(Fonts.sans, 18, Palette.MUTED);
        float x = l.todayColumn.l, w = l.todayColumn.w(), y = b.t + 18;
        c.drawText("TODAY", x, y, section);
        y += 40;
        if (feed.today == null || feed.today.items.isEmpty()) {
            Draw.line(c, "Nothing on today.", x, y, w, Draw.text(Fonts.serif, 28, Palette.MUTED));
            y += 44;
        } else {
            for (Feed.TodayItem it : feed.today.items) { if (y > b.b - 140) break; item(c, x, y, w, it); y += 44; }
        }
        if (feed.today != null && !feed.today.tomorrow.isEmpty()) {
            y += 16;
            c.drawText("TOMORROW", x, y, section);
            y += 40;
            for (Feed.TodayItem it : feed.today.tomorrow) { if (y > b.b - 10) break; item(c, x, y, w, it); y += 44; }
        }

        c.drawText("TO-DO", l.todoColumn.l, b.t + 18, section);
        if (feed.todos.isEmpty()) {
            TextPaint m = Draw.text(Fonts.sans, 20, Palette.MUTED);
            Draw.line(c, "Nothing on the list.", l.todoColumn.l, b.t + 62, l.todoColumn.w(), Draw.text(Fonts.serif, 26, Palette.MUTED));
            Draw.line(c, "Tap + to add one, or use the family site.", l.todoColumn.l, b.t + 96, l.todoColumn.w(), m);
        }
        for (int i = 0; i < l.todoRows.length; i++) {
            Feed.Todo t = feed.todos.get(i);
            RectF r = Draw.rect(l.todoRows[i]);
            c.drawRoundRect(r, 14, 14, Draw.fill(Palette.CARD));
            RectF box = new RectF(r.left + 18, r.centerY() - 18, r.left + 54, r.centerY() + 18);
            c.drawRoundRect(box, 8, 8, t.done ? Draw.fill(Palette.SAGE) : Draw.stroke(Palette.MUTED, 3));
            if (t.done) {
                android.graphics.Paint tick = Draw.stroke(0xFFFFFFFF, 4);
                tick.setStrokeCap(android.graphics.Paint.Cap.ROUND);
                c.drawLine(box.left + 9, box.centerY(), box.left + 16, box.bottom - 10, tick);
                c.drawLine(box.left + 16, box.bottom - 10, box.right - 8, box.top + 10, tick);
            }
            TextPaint tp = Draw.text(Fonts.serif, 26, t.done ? Palette.MUTED : Palette.INK);
            tp.setStrikeThruText(t.done);
            Draw.line(c, t.text, r.left + 72, r.centerY() + 9, r.width() - 90, tp);
        }
        ExtrasRenderer.addButton(c, l.addButton);
        if (l.todoRows.length < feed.todos.size()) {
            Draw.line(c, "+" + (feed.todos.size() - l.todoRows.length) + " more on the family site", l.todoColumn.l, b.b - 4, l.todoColumn.w(), Draw.text(Fonts.sans, 18, Palette.MUTED));
        }
    }

    private static void item(Canvas c, float x, float y, float w, Feed.TodayItem it) {
        c.drawCircle(x + 7, y - 9, 7, Draw.fill(it.color));
        Draw.line(c, it.time, x + 24, y, 110, Draw.text(Fonts.sans, 20, it.color));
        Draw.line(c, it.text, x + 140, y, w - 140, Draw.text(Fonts.serif, 28, Palette.INK));
    }

    // ---- the calendar: the next two weeks, day by day, flowing into two columns ----

    private void agenda(Canvas c, Layout.Box b, List<Panels.AgendaDay> days) {
        if (days.isEmpty()) {
            Draw.line(c, "Nothing in the calendar for the next two weeks.", b.l, b.t + 40, b.w(), Draw.text(Fonts.serif, 28, Palette.MUTED));
            Draw.line(c, "Add reminders or a calendar on the family site.", b.l, b.t + 80, b.w(), Draw.text(Fonts.sans, 20, Palette.MUTED));
            return;
        }
        float gap = 40, cw = (b.w() - gap) / 2, line = 40, head = 36;
        int col = 0;
        float x = b.l, y = b.t + 10;
        TextPaint dayLabel = Draw.text(Fonts.sans, 18, Palette.MUTED);
        for (Panels.AgendaDay d : days) {
            float need = head + d.items.size() * line + 14;
            if (y + Math.min(need, head + line) > b.b) { // move to the next column, or stop
                if (++col > 1) break;
                x = b.l + cw + gap;
                y = b.t + 10;
            }
            c.drawText(d.label.toUpperCase(Locale.UK), x, y + 18, dayLabel);
            y += head;
            for (Feed.TodayItem it : d.items) {
                if (y + line > b.b + 8) break;
                c.drawCircle(x + 7, y + 18, 7, Draw.fill(it.color));
                Draw.line(c, it.time, x + 24, y + 26, 100, Draw.text(Fonts.sans, 19, it.color));
                Draw.line(c, it.text, x + 130, y + 26, cw - 130, Draw.text(Fonts.serif, 26, Palette.INK));
                y += line;
            }
            y += 14;
        }
    }

    // ---- rides & walks ----

    private static int verdictColor(String v) {
        return v.equals("great") ? 0xFF5E7E5E : v.equals("good") ? Palette.SAGE : v.equals("ok") ? 0xFFA0703A : 0xFFB0504A;
    }

    private void rides(Canvas c, Layout.Box b, Panels.Rides r) {
        TextPaint section = Draw.text(Fonts.sans, 18, Palette.MUTED);
        c.drawText("THIS WEEK FOR A RIDE", b.l, b.t + 18, section);
        if (!r.days.isEmpty()) {
            float cw = b.w() / r.days.size(), top = b.t + 34;
            for (int i = 0; i < r.days.size(); i++) {
                Panels.RideDay d = r.days.get(i);
                RectF cr = new RectF(b.l + cw * i + 4, top, b.l + cw * (i + 1) - 4, top + 120);
                boolean best = d.label.equals(r.best);
                c.drawRoundRect(cr, 14, 14, Draw.fill(best ? 0xFFE9F0E6 : Palette.CARD));
                if (best) c.drawRoundRect(cr, 14, 14, Draw.stroke(0xFF5E7E5E, 2));
                centred(c, d.label, cr.centerX(), cr.top + 30, Draw.text(Fonts.sans, 20, Palette.INK));
                centred(c, d.verdict, cr.centerX(), cr.top + 66, Draw.text(Fonts.serif, 28, verdictColor(d.verdict)));
                centred(c, d.tempC + "°" + (d.rainMm > 0 ? " · " + d.rainMm + "mm" : ""), cr.centerX(), cr.top + 100, Draw.text(Fonts.sans, 18, Palette.MUTED));
            }
        } else {
            Draw.line(c, "no forecast just now", b.l, b.t + 70, b.w(), Draw.text(Fonts.sans, 22, Palette.MUTED));
        }

        float top = b.t + 178, leftW = b.w() * 0.46f;
        RectF sug = new RectF(b.l, top, b.l + leftW, b.b);
        c.drawRoundRect(sug, 16, 16, Draw.fill(Palette.CARD));
        c.drawText("SUGGESTED RIDE", sug.left + 20, sug.top + 32, section);
        String when = r.best == null ? "no great day this week — maybe a walk" : (r.best.equals("today") ? "best day: today" : "best day: " + r.best);
        Draw.line(c, when, sug.left + 20, sug.top + 66, sug.width() - 40, Draw.text(Fonts.sans, 20, 0xFF5E7E5E));
        if (r.suggestionName != null) {
            Draw.line(c, r.suggestionName, sug.left + 20, sug.top + 108, sug.width() - 40, Draw.text(Fonts.serif, 30, Palette.INK));
            if (!r.suggestionDistance.isEmpty()) Draw.line(c, r.suggestionDistance, sug.left + 20, sug.top + 140, sug.width() - 40, Draw.text(Fonts.sans, 18, Palette.MUTED));
            StaticLayout sl = new StaticLayout(r.suggestionNote, Draw.text(Fonts.sans, 20, Palette.INK), (int) (sug.width() - 40), Alignment.ALIGN_NORMAL, 1.15f, 0, false);
            c.save();
            c.clipRect(sug.left, sug.top + 156, sug.right, sug.bottom - 12);
            c.translate(sug.left + 20, sug.top + 156);
            sl.draw(c);
            c.restore();
        }

        com.cottageview.kitchen.core.RidesPanelLayout rl = com.cottageview.kitchen.core.RidesPanelLayout.compute(b, r.routes.size());
        c.drawText("READY-MADE ROUTES · TAP FOR THE MAP", rl.routesColumn.l, top + 18, section);
        TextPaint name = Draw.text(Fonts.serif, 24, Palette.INK), kind = Draw.text(Fonts.sans, 16, Palette.MUTED);
        for (int i = 0; i < rl.routeRows.length; i++) {
            Panels.Route route = r.routes.get(i);
            RectF row = Draw.rect(rl.routeRows[i]);
            c.drawRoundRect(row, 12, 12, Draw.fill(Palette.CARD));
            Draw.line(c, route.name, row.left + 14, row.centerY() + 8, row.width() - 200, name);
            String k = route.kind + (route.drive ? " · drive" : "") + (route.id >= 0 ? "  ›" : "");
            c.drawText(k, row.right - 14 - kind.measureText(k), row.centerY() + 6, kind);
        }
    }

    // ---- bits ----

    private static void centred(Canvas c, String s, float cx, float y, TextPaint p) {
        c.drawText(s, cx - p.measureText(s) / 2, y, p);
    }

    /** A weather "icon": a small round crop of the matching watercolour sky. */
    private static void icon(Canvas c, Icons icons, String key, float cx, float cy, float r) {
        RectF box = new RectF(cx - r, cy - r, cx + r, cy + r);
        Bitmap b = icons.icon("/watercolor/" + key + ".webp");
        if (b == null) c.drawCircle(cx, cy, r, Draw.fill(0x66D4E4EE));
        else Draw.imageCover(c, b, box, r, 255);
    }
}
