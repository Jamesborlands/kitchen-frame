package com.cottageview.kitchen.ui;

import android.content.res.AssetManager;
import android.graphics.Typeface;

/** Cormorant Garamond (serif headings, numbers) and Inter (text), bundled as static TTFs. */
public final class Fonts {
    public static Typeface serif = Typeface.SERIF, serifMedium = Typeface.SERIF, sans = Typeface.SANS_SERIF, sansLight = Typeface.SANS_SERIF;

    private Fonts() {}

    public static void load(AssetManager a) {
        serif = load(a, "fonts/CormorantGaramond-Regular.ttf", Typeface.SERIF);
        serifMedium = load(a, "fonts/CormorantGaramond-Medium.ttf", Typeface.SERIF);
        sans = load(a, "fonts/Inter-Regular.ttf", Typeface.SANS_SERIF);
        sansLight = load(a, "fonts/Inter-Light.ttf", Typeface.SANS_SERIF);
    }

    private static Typeface load(AssetManager a, String path, Typeface fallback) {
        try { return Typeface.createFromAsset(a, path); } catch (RuntimeException e) { return fallback; }
    }
}
