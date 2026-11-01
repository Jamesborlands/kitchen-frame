package com.cottageview.kitchen.core;

/** BitmapFactory.Options.inSampleSize: the largest power of two that still covers the target box. */
public final class SampleSize {
    private SampleSize() {}

    public static int compute(int srcW, int srcH, int maxW, int maxH) {
        if (maxW <= 0 || maxH <= 0) return 1;
        int s = 1;
        while (srcW / (s * 2) >= maxW && srcH / (s * 2) >= maxH) s *= 2;
        return s;
    }
}
