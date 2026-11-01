package com.cottageview.kitchen.core;

/**
 * Tap a photo on the frame: who sent it and when, with a ✕. ✕ asks "Remove this
 * photo?"; Yes moves it to the /family bin. Everything closes by itself if left.
 */
public final class PhotoMenu {
    public enum State { NONE, DETAILS, CONFIRM, REMOVING, REMOVED, FAILED, SENDING_HEART, HEARTED, HEART_FAILED }

    public static final long SHOW_MS = 10_000;
    public static final long RESULT_MS = 4_000;
    // give up waiting for the server: longer than Net's worst case (15 s connect + 30 s read)
    public static final long REMOVING_MS = 60_000;

    private State state = State.NONE;
    private String photoId;
    private long until;

    public State state(long now) {
        if (state != State.NONE && now > until) state = State.NONE;
        return state;
    }

    public String photoId() { return photoId; }

    /** Is anything showing (the slideshow holds still meanwhile)? */
    public boolean open(long now) { return state(now) != State.NONE; }

    public void tapPhoto(String id, long now) {
        if (state(now) == State.DETAILS && id.equals(photoId)) { state = State.NONE; return; }
        if (state == State.REMOVING || state == State.SENDING_HEART) return;
        set(State.DETAILS, id, now + SHOW_MS);
    }

    public void tapRemove(long now) {
        if (state(now) == State.DETAILS) set(State.CONFIRM, photoId, now + SHOW_MS);
    }

    /** @return the photo to remove, or null if there was no question to say yes to */
    public String tapYes(long now) {
        if (state(now) != State.CONFIRM) return null;
        set(State.REMOVING, photoId, now + REMOVING_MS);
        return photoId;
    }

    /** "❤️ Send a heart" is offered while WhatsApp still allows a reaction (24h) and none was sent yet. */
    public static boolean canHeart(Feed.Photo p, long now) {
        return p != null && !p.loved && p.lovableUntil > 0 && now < p.lovableUntil;
    }

    /** @return the photo to send a heart for, or null if the details aren't showing */
    public String tapHeart(long now) {
        if (state(now) != State.DETAILS) return null;
        set(State.SENDING_HEART, photoId, now + REMOVING_MS);
        return photoId;
    }

    /** The answer for `id`'s heart. Ignored unless the menu is still waiting on that photo. */
    public void hearted(String id, boolean ok, long now) {
        if (state(now) != State.SENDING_HEART || !id.equals(photoId)) return;
        set(ok ? State.HEARTED : State.HEART_FAILED, photoId, now + RESULT_MS);
    }

    /** The photo left the list (removed elsewhere): close its details or question. */
    public void photoGone(long now) {
        State s = state(now);
        if (s == State.DETAILS || s == State.CONFIRM) state = State.NONE;
    }

    public void tapNo(long now) {
        if (state(now) == State.CONFIRM) state = State.NONE;
    }

    /** The answer for `id`'s removal. Ignored unless the menu is still waiting on that photo. */
    public void removed(String id, boolean ok, long now) {
        if (state(now) != State.REMOVING || !id.equals(photoId)) return;
        set(ok ? State.REMOVED : State.FAILED, photoId, now + RESULT_MS);
    }

    private void set(State s, String id, long until) { state = s; photoId = id; this.until = until; }
}
