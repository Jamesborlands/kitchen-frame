package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class PhotoMenuLayoutTest {
    final Layout.Box photo = new Layout.Box(700, 20, 1346, 560);

    @Test public void buttonsSitInsideThePhotoAndAreBigEnoughForAFinger() {
        PhotoMenuLayout m = PhotoMenuLayout.compute(photo);
        for (Layout.Box b : new Layout.Box[] { m.remove, m.yes, m.no }) {
            assertTrue(b.inside(photo));
            assertTrue(b.h() >= 64);
            assertTrue(b.w() >= 64);
        }
        assertFalse(m.yes.overlaps(m.no));
    }

    @Test public void removeIsInTheTopRightCorner() {
        PhotoMenuLayout m = PhotoMenuLayout.compute(photo);
        assertTrue(m.remove.r > photo.r - 120 && m.remove.t < photo.t + 120);
    }

    @Test public void heartIsTopLeftAndClearOfRemove() {
        PhotoMenuLayout m = PhotoMenuLayout.compute(photo);
        assertTrue(m.heart.inside(photo));
        assertTrue(m.heart.l < photo.l + 40 && m.heart.t < photo.t + 120);
        assertFalse(m.heart.overlaps(m.remove));
        assertTrue(m.heart.h() >= 64);
    }
}

