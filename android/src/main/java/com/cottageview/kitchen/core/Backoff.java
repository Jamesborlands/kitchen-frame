package com.cottageview.kitchen.core;

/** Retry delay for the feed: 5s, 10s, 20s … capped at 5 min; reset after a success. */
public final class Backoff {
    static final long FIRST = 5_000, CAP = 300_000;
    private long next = FIRST;

    public long next() {
        long d = next;
        next = Math.min(next * 2, CAP);
        return d;
    }

    public void reset() { next = FIRST; }
}
