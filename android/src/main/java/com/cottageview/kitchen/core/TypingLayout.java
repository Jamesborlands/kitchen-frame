package com.cottageview.kitchen.core;

/** Adding a to-do on the frame: what's typed across the top with Add and Cancel, the keyboard below. */
public final class TypingLayout {
    public final Layout.Box field, add, cancel, keys;
    private TypingLayout(Layout.Box field, Layout.Box add, Layout.Box cancel, Layout.Box keys) {
        this.field = field; this.add = add; this.cancel = cancel; this.keys = keys;
    }

    public static TypingLayout compute(Layout.Box body) {
        float h = 72, bw = 150, gap = 14;
        Layout.Box cancel = new Layout.Box(body.r - bw, body.t, body.r, body.t + h);
        Layout.Box add = new Layout.Box(cancel.l - gap - bw, body.t, cancel.l - gap, body.t + h);
        Layout.Box field = new Layout.Box(body.l, body.t, add.l - gap, body.t + h);
        Layout.Box keys = new Layout.Box(body.l, field.b + 20, body.r, body.b);
        return new TypingLayout(field, add, cancel, keys);
    }
}
