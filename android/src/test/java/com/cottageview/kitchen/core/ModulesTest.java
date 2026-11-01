package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class ModulesTest {
    static final Layout.Box SCREEN = new Layout.Box(0, 0, 1366, 768);

    static void allInsideNoOverlap(Layout.Boxes b) {
        Layout.Box[] all = {b.warning, b.hero, b.clocks, b.notice, b.photo, b.board}; // the sidebar lies over them when open
        for (Layout.Box x : all) if (x != null) assertTrue("inside screen", x.inside(SCREEN));
        for (int i = 0; i < all.length; i++)
            for (int k = i + 1; k < all.length; k++)
                if (all[i] != null && all[k] != null) assertFalse("overlap " + i + "/" + k, all[i].overlaps(all[k]));
    }

    static Feed.Modules m(boolean clocks, boolean today, boolean todos, boolean rides, boolean board, boolean photos) {
        return new Feed.Modules(clocks, today, todos, rides, board, photos);
    }

    @Test public void anOlderServerMeansEverythingOn() throws Exception {
        Feed f = FeedParser.parse(FeedParserTest.full());
        assertSame(Feed.Modules.ALL, f.modules);
    }

    @Test public void parsesTheSwitches() throws Exception {
        String json = FeedParserTest.full().replaceFirst("\\}$",
            ",\"modules\":{\"clocks\":false,\"today\":true,\"todos\":false,\"rides\":false,\"board\":true,\"photos\":true}}");
        Feed f = FeedParser.parse(json);
        Feed.Modules mm = f.modules;
        assertFalse(mm.clocks);
        assertTrue(mm.today);
        assertFalse(mm.todos);
        assertFalse(mm.rides);
        assertTrue(mm.board && mm.photos);
        // and they survive the frame's own edits to the feed
        assertSame(mm, f.withTodos(java.util.Collections.<Feed.Todo>emptyList()).modules);
    }

    @Test public void allOnIsTheTestedLayout() {
        Layout.Boxes a = Layout.compute(1366, 768, true, true, 2, 18);
        Layout.Boxes b = Layout.compute(1366, 768, true, true, 2, 18, Feed.Modules.ALL);
        assertEquals(a.hero.b, b.hero.b, 0.01);
        assertEquals(a.photo.r, b.photo.r, 0.01);
        assertEquals(a.board.t, b.board.t, 0.01);
    }

    @Test public void noClocksGivesTheWeatherPictureTheirRoom() {
        Layout.Boxes all = Layout.compute(1366, 768, false, false, 2, 18, Feed.Modules.ALL);
        Layout.Boxes b = Layout.compute(1366, 768, false, false, 2, 18, m(false, true, true, true, true, true));
        assertNull(b.clocks);
        assertTrue(b.hero.h() > all.hero.h() + 150);
        assertEquals(b.notice.t - Layout.ROW_GAP, b.hero.b, 0.5);
        allInsideNoOverlap(b);
    }

    @Test public void noTodayCardMovesTheClocksDown() {
        Layout.Boxes b = Layout.compute(1366, 768, false, false, 2, 18, m(true, false, true, true, true, true));
        assertNull(b.notice);
        assertEquals(768 - Layout.PAD, b.clocks.b, 0.5);
        allInsideNoOverlap(b);
    }

    @Test public void noPhotosTheLeftSideTakesTheWidthAndTheBoardRunsAlongTheBottom() {
        Layout.Boxes b = Layout.compute(1366, 768, false, true, 2, 18, m(true, true, true, true, true, false));
        assertNull(b.photo);
        assertEquals(1366 - Layout.PAD, b.hero.r, 0.5);
        assertEquals(b.hero.l, b.board.l, 0.5);
        assertEquals(1366 - Layout.PAD, b.board.r, 0.5);
        assertEquals(768 - Layout.PAD, b.board.b, 0.5);
        assertTrue(b.notice.b <= b.board.t);
        assertTrue("hero still a decent picture", b.hero.h() >= 150);
        allInsideNoOverlap(b);
    }

    @Test public void noPhotosNoBoard() {
        Layout.Boxes b = Layout.compute(1366, 768, false, false, 2, 18, m(true, true, true, true, false, false));
        assertNull(b.photo);
        assertNull(b.board);
        assertEquals(768 - Layout.PAD, b.notice.b, 0.5);
        allInsideNoOverlap(b);
    }

    @Test public void everythingOffStillDrawsTheWeather() {
        Layout.Boxes b = Layout.compute(1366, 768, true, false, 2, 18, m(false, false, false, false, false, false));
        assertNotNull(b.hero);
        assertEquals(768 - Layout.PAD, b.hero.b, 0.5);
        allInsideNoOverlap(b);
    }

    @Test public void theSidebarOnlyShowsWhatsOn() {
        assertEquals(java.util.Arrays.asList(Layout.Rail.CALENDAR, Layout.Rail.TODO, Layout.Rail.RIDES, Layout.Rail.MESSAGES, Layout.Rail.SETTINGS),
            Layout.railButtons(Feed.Modules.ALL));
        assertEquals(java.util.Arrays.asList(Layout.Rail.CALENDAR, Layout.Rail.MESSAGES, Layout.Rail.SETTINGS),
            Layout.railButtons(m(true, true, false, false, true, true)));
    }

    @Test public void aChangedSwitchIsNoticed() {
        assertTrue(Feed.Modules.ALL.sameAs(m(true, true, true, true, true, true)));
        assertFalse(Feed.Modules.ALL.sameAs(m(true, true, true, true, true, false)));
        assertFalse(Feed.Modules.ALL.sameAs(null));
    }
}
