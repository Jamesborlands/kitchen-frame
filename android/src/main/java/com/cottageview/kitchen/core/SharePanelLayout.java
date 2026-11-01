package com.cottageview.kitchen.core;

/** The Settings panel: a big QR code on the left (scan it to open the family page), the words on the right. */
public final class SharePanelLayout {
    public final Layout.Box qr, text, wifi;
    private SharePanelLayout(Layout.Box qr, Layout.Box text, Layout.Box wifi) { this.qr = qr; this.text = text; this.wifi = wifi; }

    public static SharePanelLayout compute(Layout.Box body) {
        float side = Math.min(body.h(), body.w() * 0.42f);
        Layout.Box qr = new Layout.Box(body.l, body.t, body.l + side, body.t + side);
        Layout.Box text = new Layout.Box(qr.r + 48, body.t, body.r, body.b);
        // "Wi-Fi settings": the way to Android's own Wi-Fi screen (the kitchen is the home screen)
        Layout.Box wifi = new Layout.Box(text.l, body.b - 72, text.l + 320, body.b);
        return new SharePanelLayout(qr, text, wifi);
    }
}
