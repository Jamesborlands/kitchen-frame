package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class PhotoMenuTest {
    @Test public void tapShowsDetailsThenTheyFadeAway() {
        PhotoMenu m = new PhotoMenu();
        m.tapPhoto("p1", 0);
        assertEquals(PhotoMenu.State.DETAILS, m.state(1000));
        assertEquals("p1", m.photoId());
        assertEquals(PhotoMenu.State.NONE, m.state(PhotoMenu.SHOW_MS + 1));
    }

    @Test public void removeAsksFirst() {
        PhotoMenu m = new PhotoMenu();
        m.tapPhoto("p1", 0);
        m.tapRemove(1000);
        assertEquals(PhotoMenu.State.CONFIRM, m.state(1500));
        assertEquals("p1", m.tapYes(2000));
        assertEquals(PhotoMenu.State.REMOVING, m.state(2100));
    }

    @Test public void noGoesBack() {
        PhotoMenu m = new PhotoMenu();
        m.tapPhoto("p1", 0);
        m.tapRemove(1000);
        m.tapNo(1500);
        assertEquals(PhotoMenu.State.NONE, m.state(1600));
    }

    @Test public void yesOnlyCountsWhileAsking() {
        PhotoMenu m = new PhotoMenu();
        assertNull(m.tapYes(0));
        m.tapPhoto("p1", 0);
        assertNull(m.tapYes(10)); // no "are you sure" yet
        m.tapRemove(20);
        assertNull(m.tapYes(20 + PhotoMenu.SHOW_MS + 1)); // the question timed out
    }

    @Test public void reportsTheOutcome() {
        PhotoMenu m = new PhotoMenu();
        m.tapPhoto("p1", 0); m.tapRemove(1); m.tapYes(2);
        m.removed("p1", true, 500);
        assertEquals(PhotoMenu.State.REMOVED, m.state(600));
        assertEquals(PhotoMenu.State.NONE, m.state(500 + PhotoMenu.RESULT_MS + 1));
        m.tapPhoto("p2", 10_000); m.tapRemove(10_001); m.tapYes(10_002);
        m.removed("p2", false, 10_500);
        assertEquals(PhotoMenu.State.FAILED, m.state(10_600));
    }

    @Test public void tappingTheDetailsAgainClosesThem() {
        PhotoMenu m = new PhotoMenu();
        m.tapPhoto("p1", 0);
        m.tapPhoto("p1", 100);
        assertEquals(PhotoMenu.State.NONE, m.state(200));
    }

    @Test public void holdsTheSlideshowWhileOpen() {
        PhotoMenu m = new PhotoMenu();
        assertFalse(m.open(0));
        m.tapPhoto("p1", 0);
        assertTrue(m.open(100));
    }

    @Test public void sendAHeart() {
        PhotoMenu m = new PhotoMenu();
        m.tapPhoto("p1", 0);
        assertEquals("p1", m.tapHeart(100));
        assertEquals(PhotoMenu.State.SENDING_HEART, m.state(200));
        m.hearted("p1", true, 300);
        assertEquals(PhotoMenu.State.HEARTED, m.state(400));
        assertEquals(PhotoMenu.State.NONE, m.state(300 + PhotoMenu.RESULT_MS + 1));
    }

    @Test public void aHeartThatFailsSaysSo() {
        PhotoMenu m = new PhotoMenu();
        m.tapPhoto("p1", 0);
        m.tapHeart(100);
        m.hearted("p1", false, 300);
        assertEquals(PhotoMenu.State.HEART_FAILED, m.state(400));
    }

    @Test public void heartOnlyFromTheDetails() {
        PhotoMenu m = new PhotoMenu();
        assertNull(m.tapHeart(0));
    }

    @Test public void heartButtonOnlyWhileWhatsAppAllowsIt() {
        Feed.Photo fresh = new Feed.Photo("a", "/a", "Kate", "KA", 0, 1000, false);
        Feed.Photo loved = new Feed.Photo("b", "/b", "Kate", "KA", 0, 1000, true);
        Feed.Photo old = new Feed.Photo("c", "/c", "Kate", "KA", 0, 1000, false);
        Feed.Photo never = new Feed.Photo("d", "/d", "Sam", "SA", 0, 0, false);
        assertTrue(PhotoMenu.canHeart(fresh, 999));
        assertFalse(PhotoMenu.canHeart(loved, 999));
        assertFalse(PhotoMenu.canHeart(old, 1001));
        assertFalse(PhotoMenu.canHeart(never, 1));
    }

    @Test public void aLateResultForAnotherPhotoIsIgnored() {
        PhotoMenu m = new PhotoMenu();
        m.tapPhoto("p1", 0); m.tapRemove(1); m.tapYes(2);
        m.tapPhoto("p2", 3);                    // can't: still removing p1
        m.removed("p9", true, 500);             // someone else's answer
        assertEquals(PhotoMenu.State.REMOVING, m.state(600));
        m.removed("p1", true, 700);
        assertEquals(PhotoMenu.State.REMOVED, m.state(800));
    }

    @Test public void aResultAfterGivingUpDoesNotPopUpOverAnotherPhoto() {
        PhotoMenu m = new PhotoMenu();
        m.tapPhoto("p1", 0); m.tapHeart(1);
        long late = 1 + PhotoMenu.REMOVING_MS + 1;    // gave up waiting
        m.tapPhoto("p2", late);
        m.hearted("p1", true, late + 10);
        assertEquals(PhotoMenu.State.DETAILS, m.state(late + 20));
        assertEquals("p2", m.photoId());
    }

    @Test public void waitsLongerThanTheNetworkCanTake() {
        assertTrue(PhotoMenu.REMOVING_MS >= 60_000); // Net: 15 s connect + 30 s read
    }

    @Test public void closesWhenItsPhotoIsGone() {
        PhotoMenu m = new PhotoMenu();
        m.tapPhoto("p1", 0);
        m.photoGone(10);
        assertEquals(PhotoMenu.State.NONE, m.state(20));
    }
}
