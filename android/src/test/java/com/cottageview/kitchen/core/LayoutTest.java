package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class LayoutTest {
    static final Layout.Box SCREEN = new Layout.Box(0, 0, 1366, 768);

    static void allInsideNoOverlap(Layout.Boxes b) {
        Layout.Box[] all = {b.warning, b.hero, b.clocks, b.notice, b.photo, b.board};
        for (Layout.Box x : all) if (x != null) assertTrue("inside screen", x.inside(SCREEN));
        for (int i = 0; i < all.length; i++)
            for (int k = i + 1; k < all.length; k++)
                if (all[i] != null && all[k] != null) assertFalse("overlap " + i + "/" + k, all[i].overlaps(all[k]));
    }

    @Test public void plainKitchen() {
        Layout.Boxes b = Layout.compute(1366, 768, false, false, 2, 18);
        assertNull(b.warning);
        assertNull(b.board);
        allInsideNoOverlap(b);
        assertTrue("hero is still the big one (layout 2 gives ~65 px to the Today card)", b.hero.h() >= 340);
        assertEquals(728, b.photo.h(), 0.5); // full height minus padding (no section labels — Sam, 2026-10-11)
        assertEquals(20, b.hero.t, 0.5);
        assertTrue("clock cards have room for the big time", b.clocks.h() >= 2 * 84);
        assertEquals(1.1f, b.photo.w() / b.hero.w(), 0.01f); // layout 3: the sidebar's width comes out of the photo's share
        assertTrue("clock cards keep room for 'Edinburgh' and the time", Layout.clockBox(b.clocks, 1).w() >= 278);
    }

    @Test public void withWarningAndBoard() {
        Layout.Boxes b = Layout.compute(1366, 768, true, true, 2, 18);
        assertNotNull(b.warning);
        assertNotNull(b.board);
        allInsideNoOverlap(b);
        assertTrue(b.board.t > b.photo.b);
        assertTrue(b.tile >= 30);
        assertTrue("photo still dominates", b.photo.h() > 2 * b.board.h());
        assertTrue(b.hero.h() >= 300);
        assertTrue("hero sits below the warning", b.hero.t >= b.warning.b);
    }

    @Test public void boxContainsPointsInsideOnly() {
        Layout.Box b = new Layout.Box(10, 20, 110, 220);
        assertTrue(b.contains(10, 20));
        assertTrue(b.contains(60, 100));
        assertFalse(b.contains(110, 100)); // right edge belongs to the next box
        assertFalse(b.contains(5, 100));
        assertFalse(b.contains(60, 230));
    }

    @Test public void clockCardsTileTheClockArea() {
        Layout.Box area = new Layout.Box(20, 466, 588, 650);
        Layout.Box a = Layout.clockBox(area, 0), b = Layout.clockBox(area, 1), c = Layout.clockBox(area, 2);
        assertTrue(a.inside(area) && b.inside(area));
        assertFalse(a.overlaps(b));
        assertEquals(a.l, c.l, 0.01);
        assertTrue(c.t > a.b);
        assertEquals(Layout.CLOCK_H, a.h(), 0.01);
    }

    @Test public void layoutTwoGivesTheTodayCardRoomForThreeThings() {
        Layout.Boxes b = Layout.compute(1366, 768, false, false, 2, 18);
        assertEquals(Layout.TODAY_H, b.notice.h(), 0.01);
        assertTrue(Layout.TODAY_H >= 150);
        assertTrue(b.hero.h() >= 340);
    }

    @Test public void theSidebarIsHiddenBehindAHandleAndSlidesOutOverTheLeft() {
        Layout.Boxes b = Layout.compute(1366, 768, false, false, 2, 18);
        Layout.Box screen = new Layout.Box(0, 0, 1366, 768);
        // hidden: the kitchen uses the full width
        assertEquals(Layout.PAD, b.hero.l, 0.5);
        assertEquals(Layout.PAD, b.notice.l, 0.5);
        // a handle on the left edge, big enough for a finger
        assertTrue(b.handle.inside(screen));
        assertEquals(0, b.handle.l, 0.5);
        assertTrue(b.handle.w() >= 36 && b.handle.h() >= 100);
        // opened, the sidebar lies over the left of the kitchen
        assertTrue(b.rail.inside(screen));
        assertTrue(b.rail.w() <= 84);
        for (int i = 0; i < Layout.RAIL_BUTTONS; i++) {
            Layout.Box btn = Layout.railButton(b.rail, i);
            assertTrue(btn.inside(b.rail));
            assertTrue(btn.h() >= 64 && btn.w() >= 56);
            if (i > 0) assertFalse(btn.overlaps(Layout.railButton(b.rail, i - 1)));
        }
    }

    @Test public void anOpenSidebarPushesEverythingAlongInsteadOfCoveringIt() {
        Layout.Boxes shut = Layout.compute(1366, 768, false, true, 2, 18, Feed.Modules.ALL, false);
        Layout.Boxes open = Layout.compute(1366, 768, false, true, 2, 18, Feed.Modules.ALL, true);
        Layout.Box screen = new Layout.Box(0, 0, 1366, 768);
        assertEquals(Layout.PAD, shut.hero.l, 0.5);
        Layout.Box[] all = {open.hero, open.clocks, open.notice, open.photo, open.board};
        for (Layout.Box b : all) {
            assertTrue(b.inside(screen));
            assertFalse("nothing under the sidebar", b.overlaps(open.rail));
            assertTrue(b.l >= open.rail.r);
        }
        assertEquals("the photo keeps its share", 1.1f, open.photo.w() / open.hero.w(), 0.01f);
        assertTrue("things shrink, not vanish", open.hero.w() > shut.hero.w() * 0.85f);
    }
}

