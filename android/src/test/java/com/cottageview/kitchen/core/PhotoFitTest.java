package com.cottageview.kitchen.core;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

public class PhotoFitTest {
    static final int W = 738, H = 728; // the photo panel at 1366×768

    @Test public void wholeAlwaysContains() {
        assertEquals(PhotoFit.Draw.CONTAIN, PhotoFit.decide(PhotoFit.Mode.WHOLE, 4000, 3000, W, H));
        assertEquals(PhotoFit.Draw.CONTAIN, PhotoFit.decide(PhotoFit.Mode.WHOLE, 3000, 4000, W, H));
    }
    @Test public void fillAlwaysCovers() {
        assertEquals(PhotoFit.Draw.COVER, PhotoFit.decide(PhotoFit.Mode.FILL, 4000, 3000, W, H));
        assertEquals(PhotoFit.Draw.COVER, PhotoFit.decide(PhotoFit.Mode.FILL, 3000, 4000, W, H));
    }
    @Test public void smartFillsLandscapeButKeepsPortraitWhole() {
        assertEquals(PhotoFit.Draw.COVER, PhotoFit.decide(PhotoFit.Mode.SMART, 4000, 3000, W, H));   // 4:3
        assertEquals(PhotoFit.Draw.CONTAIN, PhotoFit.decide(PhotoFit.Mode.SMART, 3000, 4000, W, H)); // 3:4 — never crop heads
    }
    @Test public void smartKeepsVeryWidePanoramasWhole() {
        assertEquals(PhotoFit.Draw.CONTAIN, PhotoFit.decide(PhotoFit.Mode.SMART, 4000, 1500, W, H));
    }
    @Test public void parsesModeNames() {
        assertEquals(PhotoFit.Mode.SMART, PhotoFit.Mode.parse(null));
        assertEquals(PhotoFit.Mode.SMART, PhotoFit.Mode.parse("nonsense"));
        assertEquals(PhotoFit.Mode.WHOLE, PhotoFit.Mode.parse(" whole\n"));
        assertEquals(PhotoFit.Mode.FILL, PhotoFit.Mode.parse("FILL"));
    }
}
