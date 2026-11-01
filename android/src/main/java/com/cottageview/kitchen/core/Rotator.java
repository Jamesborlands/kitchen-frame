package com.cottageview.kitchen.core;

/**
 * Which slide is showing: advances one step per interval, starts over at 0 when
 * the content changes (a new photo or note arrives), and reports how long ago it
 * last switched so renderers can crossfade/flip.
 */
public final class Rotator {
    public static final class State {
        public final int index;
        public final long sinceSwitchMs;
        public final boolean changed;
        /** The content itself changed (a new photo or message), not just the next slide. */
        public final boolean fresh;
        State(int index, long sinceSwitchMs, boolean changed, boolean fresh) { this.index = index; this.sinceSwitchMs = sinceSwitchMs; this.changed = changed; this.fresh = fresh; }
    }

    private final long intervalMs;
    private String signature;
    private int index;
    private long switchedAt;
    private long holdUntil;

    public Rotator(long intervalMs) { this.intervalMs = intervalMs; }

    public State tick(int count, String sig, long now) {
        boolean changed = false, fresh = false;
        if (signature == null || !signature.equals(sig)) {
            signature = sig;
            index = 0;
            switchedAt = now;
            changed = true;
            fresh = true;
        } else if (count > 1 && now - switchedAt >= intervalMs && now >= holdUntil) {
            index = (index + 1) % count;
            // keep a steady rhythm; after a long pause (screen asleep, slow frame) start the beat fresh
            long due = Math.max(switchedAt + intervalMs, holdUntil);
            switchedAt = now - due < intervalMs ? due : now;
            changed = true;
        }
        if (index >= Math.max(count, 1)) { index = 0; switchedAt = now; changed = true; }
        return new State(index, now - switchedAt, changed, fresh);
    }

    /** Someone swiped: jump `delta` slides (wrapping), then stay there for `holdMs` before the slideshow carries on. */
    public State step(int delta, int count, long now, long holdMs) {
        if (count < 1) return new State(0, 0, false, false);
        index = ((index + delta) % count + count) % count;
        switchedAt = now;
        holdUntil = now + holdMs;
        return new State(index, 0, true, false);
    }

    /**
     * The list changed while someone is looking at a photo (its menu is open): stay on
     * that photo, now at `index` under the new signature, instead of starting over.
     */
    public void keep(String sig, int index) { signature = sig; this.index = index; }

    /** Keep the current slide for at least `ms` more (someone's looking at it) — no new crossfade. */
    public void hold(long now, long ms) { holdUntil = Math.max(holdUntil, now + ms); }
}

