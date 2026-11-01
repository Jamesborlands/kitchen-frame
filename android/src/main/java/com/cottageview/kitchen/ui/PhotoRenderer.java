package com.cottageview.kitchen.ui;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.RectF;
import android.text.TextPaint;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.core.Layout;
import com.cottageview.kitchen.core.PhotoFit;
import com.cottageview.kitchen.core.Rotator;

/** "From the family": the photo whole over a blurred enlargement of itself, crossfading (components/PhotoFrame.tsx). */
public final class PhotoRenderer {
    static final long FADE_MS = 1200;
    /** How photos fill the panel; the Controller sets it from the feed's photoFit (default SMART). */
    static volatile PhotoFit.Mode fit = PhotoFit.Mode.SMART;

    public static void setFit(PhotoFit.Mode m) { fit = m; }
    // by photo, not position: a new photo at the front shifts every index, and that
    // mustn't start a crossfade (or put the menu on the wrong photo)
    private Feed.Photo shown, previous;
    /** The photo menu is open: its buttons sit where the initials badge goes. */
    boolean hideBadge;
    /** sinceSwitchMs when the shown photo's image first became ready (it may still be downloading). */
    private long readyAtMs = -1;

    private boolean loading;

    /** The photo actually on screen: the previous one while the next is still loading. */
    Feed.Photo drawn() { return loading && previous != null ? previous : shown; }

    /** @return true while crossfading */
    boolean draw(Canvas c, Layout.Box box, Feed feed, Rotator.State s, KitchenView.ImageSource images) {
        RectF r = Draw.rect(box);
        c.drawRoundRect(r, 16, 16, Draw.fill(0x66D4E4EE));
        if (feed.photos.isEmpty()) {
            TextPaint p = Draw.text(Fonts.serif, 22, Palette.MUTED);
            String msg = "photos from the family appear here";
            c.drawText(msg, r.centerX() - p.measureText(msg) / 2, r.centerY(), p);
            c.drawRoundRect(r, 16, 16, Draw.stroke(Palette.DIVIDER, 1));
            return false;
        }
        Feed.Photo p = feed.photos.get(s.index);
        if (shown == null || !shown.id.equals(p.id)) { previous = shown; shown = p; readyAtMs = -1; }
        else shown = p; // same photo, maybe fresher details (a heart sent)
        boolean hasPrevious = previous != null && !previous.id.equals(p.id);
        loading = images.photo(p.url) == null;
        if (loading) {
            // still loading (a swipe can outrun the download): keep the previous photo up, never a blank panel
            if (hasPrevious) slide(c, r, previous, images, 255);
            c.drawRoundRect(r, 16, 16, Draw.stroke(Palette.DIVIDER, 1));
            return false; // imagesChanged() redraws us when it arrives
        }
        if (readyAtMs < 0) readyAtMs = s.sinceSwitchMs;
        long since = s.sinceSwitchMs - readyAtMs; // fade from when it was ready, not from the swipe
        boolean fading = since < FADE_MS && hasPrevious;
        if (fading) slide(c, r, previous, images, 255);
        int alpha = fading ? (int) (255 * since / FADE_MS) : 255;
        slide(c, r, p, images, alpha);
        c.drawRoundRect(r, 16, 16, Draw.stroke(Palette.DIVIDER, 1));
        return fading;
    }

    private void slide(Canvas c, RectF r, Feed.Photo p, KitchenView.ImageSource images, int alpha) {
        Bitmap full = images.photo(p.url);
        if (full == null) return;
        if (PhotoFit.decide(fit, full.getWidth(), full.getHeight(), r.width(), r.height()) == PhotoFit.Draw.COVER) {
            Draw.imageCover(c, full, r, 16, alpha);
        } else {
            Draw.imageCover(c, images.blurred(p.url), r, 16, alpha);
            c.drawRoundRect(r, 16, 16, Draw.fill(((alpha * 0x14 / 255) << 24)));
            Draw.imageContain(c, full, r, 16, alpha);
        }
        if (alpha == 255 && !hideBadge && p.initials != null && !p.initials.isEmpty()) Draw.badge(c, p.initials, r.right - 30, r.top + 30, 17);
    }
}
