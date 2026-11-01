package com.cottageview.kitchen.core;

/** A panel closes itself after 45 s without a touch (KITCHEN.panelIdleMs on the web), so the kitchen always drifts back. */
public final class PanelTimer {
    public static final long IDLE_MS = 45_000;
    private long lastTouch;

    public void touched(long now) { lastTouch = now; }
    public boolean expired(long now) { return now - lastTouch > IDLE_MS; }
}
