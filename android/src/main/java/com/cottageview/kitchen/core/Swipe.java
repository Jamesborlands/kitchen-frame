package com.cottageview.kitchen.core;

/** Is a finger movement a sideways swipe across the photo? +1 = next (finger moved left), -1 = previous, 0 = neither. */
public final class Swipe {
    private Swipe() {}

    static final float MIN_DISTANCE_PX = 80;  // ~1.3cm on this 1366×768 panel: more than a wobbly tap
    static final long MAX_DURATION_MS = 2000; // longer than that is a press that wandered, not a swipe

    public static int classify(float dx, float dy, long durationMs) {
        if (durationMs > MAX_DURATION_MS) return 0;
        if (Math.abs(dx) < MIN_DISTANCE_PX || Math.abs(dx) < Math.abs(dy) * 1.5f) return 0;
        return dx < 0 ? 1 : -1;
    }
}
