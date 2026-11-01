package com.cottageview.kitchen.core;

/** The sidebar: hidden behind a handle until tapped, then tucks itself away after OPEN_MS without a touch. */
public final class Drawer {
    public static final long OPEN_MS = 10_000;
    private long openUntil;

    public void open(long now) { openUntil = now + OPEN_MS; }
    public void close() { openUntil = 0; }
    public boolean isOpen(long now) { return now < openUntil; }
}
