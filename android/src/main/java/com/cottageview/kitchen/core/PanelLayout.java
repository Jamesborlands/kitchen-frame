package com.cottageview.kitchen.core;

/** A panel: a card over the kitchen with a title, a big × top-right, and a body. */
public final class PanelLayout {
    static final float MARGIN = 28, PAD = 28, CLOSE = 80, TITLE_H = 84;

    public final Layout.Box card, close, body;
    public final float titleX, titleBaseline;

    private PanelLayout(Layout.Box card, Layout.Box close, Layout.Box body, float titleX, float titleBaseline) {
        this.card = card; this.close = close; this.body = body; this.titleX = titleX; this.titleBaseline = titleBaseline;
    }

    public static PanelLayout compute(float w, float h) {
        Layout.Box card = new Layout.Box(MARGIN, MARGIN, w - MARGIN, h - MARGIN);
        Layout.Box close = new Layout.Box(card.r - 16 - CLOSE, card.t + 16, card.r - 16, card.t + 16 + CLOSE);
        Layout.Box body = new Layout.Box(card.l + PAD, card.t + PAD + TITLE_H, card.r - PAD, card.b - PAD);
        return new PanelLayout(card, close, body, card.l + PAD, card.t + PAD + 40);
    }
}
