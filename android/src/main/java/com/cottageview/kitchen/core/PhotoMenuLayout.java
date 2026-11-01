package com.cottageview.kitchen.core;

/** Where the photo menu's buttons go inside the photo: ✕ top-right; Yes / No centred low down. */
public final class PhotoMenuLayout {
    static final float BTN = 72, PAD = 16, GAP = 20, WIDE = 200, PILL = 176, HEART = 250;

    public final Layout.Box remove, yes, no, heart;

    private PhotoMenuLayout(Layout.Box remove, Layout.Box yes, Layout.Box no, Layout.Box heart) {
        this.remove = remove; this.yes = yes; this.no = no; this.heart = heart;
    }

    public static PhotoMenuLayout compute(Layout.Box photo) {
        Layout.Box remove = new Layout.Box(photo.r - PAD - PILL, photo.t + PAD, photo.r - PAD, photo.t + PAD + BTN);
        float cx = (photo.l + photo.r) / 2, top = photo.t + photo.h() * 0.58f;
        float w = Math.min(WIDE, (photo.w() - 2 * PAD - GAP) / 2);
        Layout.Box yes = new Layout.Box(cx - GAP / 2 - w, top, cx - GAP / 2, top + BTN);
        Layout.Box no = new Layout.Box(cx + GAP / 2, top, cx + GAP / 2 + w, top + BTN);
        Layout.Box heart = new Layout.Box(photo.l + PAD, photo.t + PAD, photo.l + PAD + HEART, photo.t + PAD + BTN);
        return new PhotoMenuLayout(remove, yes, no, heart);
    }
}
