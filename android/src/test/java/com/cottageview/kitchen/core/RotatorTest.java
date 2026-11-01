package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class RotatorTest {
    @Test public void advancesEveryInterval() {
        Rotator r = new Rotator(1000);
        assertEquals(0, r.tick(3, "a", 0).index);
        assertEquals(0, r.tick(3, "a", 999).index);
        Rotator.State s = r.tick(3, "a", 1000);
        assertEquals(1, s.index);
        assertTrue(s.changed);
        assertEquals(0, s.sinceSwitchMs);
        assertEquals(2, r.tick(3, "a", 2500).index);
        assertEquals(500, r.tick(3, "a", 2500).sinceSwitchMs);
        assertEquals(0, r.tick(3, "a", 3000).index);
    }
    @Test public void newContentStartsOver() {
        Rotator r = new Rotator(1000);
        r.tick(3, "a", 0);
        r.tick(3, "a", 1500);
        Rotator.State s = r.tick(3, "b", 1600);
        assertEquals(0, s.index);
        assertTrue(s.changed);
        assertEquals(0, r.tick(3, "b", 2500).index);
        assertEquals(1, r.tick(3, "b", 2600).index);
    }
    @Test public void singleItemNeverMoves() {
        Rotator r = new Rotator(1000);
        r.tick(1, "a", 0);
        assertEquals(0, r.tick(1, "a", 99_000).index);
        assertFalse(r.tick(1, "a", 99_001).changed);
    }
    @Test public void countShrinkingClampsIndex() {
        Rotator r = new Rotator(1000);
        r.tick(5, "a", 0);
        r.tick(5, "a", 1000);
        r.tick(5, "a", 2000);
        assertEquals(3, r.tick(5, "a", 3000).index);
        assertEquals(0, r.tick(2, "a", 3100).index);
    }
    @Test public void aLongPauseSkipsAheadWithoutLooping() {
        Rotator r = new Rotator(1000);
        r.tick(3, "a", 0);
        assertEquals(1, r.tick(3, "a", 10_000).index); // one step per tick, not ten
    }

    @Test public void stepJumpsAndHoldsBeforeCarryingOn() {
        Rotator r = new Rotator(1000);
        r.tick(5, "a", 0);
        Rotator.State s = r.step(1, 5, 500, 60_000);
        assertEquals(1, s.index);
        assertEquals(0, s.sinceSwitchMs);
        assertTrue(s.changed);
        assertEquals(1, r.tick(5, "a", 30_000).index);  // held while they look
        assertEquals(2, r.tick(5, "a", 60_500).index);  // then the slideshow carries on
        assertEquals(3, r.tick(5, "a", 61_500).index);  // at its usual pace
    }

    @Test public void stepWrapsBothWays() {
        Rotator r = new Rotator(1000);
        r.tick(3, "a", 0);
        assertEquals(2, r.step(-1, 3, 10, 0).index);
        assertEquals(0, r.step(1, 3, 20, 0).index);
    }

    @Test public void stepWithNothingToShowStaysPut() {
        Rotator r = new Rotator(1000);
        r.tick(0, "", 0);
        assertEquals(0, r.step(1, 0, 10, 0).index);
    }

    @Test public void holdKeepsTheSlideWithoutRestartingIt() {
        Rotator r = new Rotator(1000);
        r.tick(5, "a", 0);
        r.hold(500, 10_000);
        Rotator.State s = r.tick(5, "a", 5000);
        assertEquals(0, s.index);
        assertEquals(5000, s.sinceSwitchMs); // no new crossfade
        assertEquals(1, r.tick(5, "a", 10_500).index);
    }

    @Test public void keepPinsAPhotoWhenTheListChangesUnderIt() {
        Rotator r = new Rotator(1000);
        r.tick(5, "a", 0);
        r.step(3, 5, 100, 0);                 // looking at index 3
        r.keep("b", 4);                        // a new photo arrived at the front: ours is now index 4
        Rotator.State s = r.tick(6, "b", 200);
        assertEquals(4, s.index);              // not reset to the newest
        assertFalse(s.changed);
    }

    @Test public void newContentIsMarkedFreshAndCanBeHeld() {
        Rotator r = new Rotator(1000);
        assertTrue(r.tick(3, "a", 0).fresh);
        r.tick(3, "a", 1000);
        Rotator.State s = r.tick(3, "a", 2000);
        assertFalse("a normal advance isn't new content", s.fresh);
        Rotator.State n = r.tick(4, "b", 2500); // a new photo arrived
        assertTrue(n.fresh);
        assertEquals(0, n.index);
        r.hold(2500, 120_000);
        assertEquals("the new photo stays", 0, r.tick(4, "b", 60_000).index);
        assertEquals(1, r.tick(4, "b", 123_000).index);
    }
}

