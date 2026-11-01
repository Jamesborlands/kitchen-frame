package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

public class PhotoListTest {
    static Feed.Photo p(String id, long at) { return new Feed.Photo(id, "/" + id, "Kate", "KA", at); }

    /** newest first: ids n-1 … 0 with at = index */
    static List<Feed.Photo> range(int from, int to) {
        List<Feed.Photo> out = new ArrayList<>();
        for (int i = to - 1; i >= from; i--) out.add(p("p" + i, i));
        return out;
    }

    static List<String> ids(List<Feed.Photo> l) {
        List<String> out = new ArrayList<>();
        for (Feed.Photo x : l) out.add(x.id);
        return out;
    }

    @Test public void noListYetShowsTheFeedsPhotos() {
        List<Feed.Photo> feed = range(60, 100);
        assertEquals(ids(feed), ids(PhotoList.merge(feed, null)));
    }

    @Test public void theFullListAddsTheOlderPhotos() {
        List<Feed.Photo> feed = range(60, 100); // newest 40
        PhotoList cached = new PhotoList("v", range(0, 100));
        assertEquals(ids(range(0, 100)), ids(PhotoList.merge(feed, cached)));
    }

    @Test public void aNewPhotoShowsBeforeTheListIsRefetched() {
        List<Feed.Photo> feed = range(61, 101); // p100 just arrived
        PhotoList stale = new PhotoList("old", range(0, 100));
        List<Feed.Photo> m = PhotoList.merge(feed, stale);
        assertEquals("p100", m.get(0).id);
        assertEquals(101, m.size());
    }

    @Test public void aRecentPhotoRemovedElsewhereStaysGone() {
        List<Feed.Photo> feed = new ArrayList<>(range(60, 100));
        feed.remove(5); // p94 deleted on /family
        List<Feed.Photo> stale = range(0, 100);
        List<String> m = ids(PhotoList.merge(feed, new PhotoList("old", stale)));
        assertFalse(m.contains("p94"));
    }

    @Test public void whenTheFeedHoldsEveryPhotoTheListAddsNothing() {
        List<Feed.Photo> feed = range(0, 10); // fewer than FEED_PHOTOS: this is all of them
        PhotoList stale = new PhotoList("old", range(0, 30)); // 10..29 since deleted
        assertEquals(ids(feed), ids(PhotoList.merge(feed, stale)));
    }

    @Test public void fetchesOnlyWhenTheVersionChanged() {
        assertFalse(PhotoList.needsFetch(null, null));            // server too old to have a list
        assertTrue(PhotoList.needsFetch("v2", null));
        assertTrue(PhotoList.needsFetch("v2", new PhotoList("v1", range(0, 1))));
        assertFalse(PhotoList.needsFetch("v2", new PhotoList("v2", range(0, 1))));
    }

    @Test public void roundTripsThroughJson() throws Exception {
        PhotoList l = new PhotoList("v9", range(0, 3));
        PhotoList back = FeedParser.parsePhotoList(l.toJson());
        assertEquals("v9", back.version);
        assertEquals(ids(l.photos), ids(back.photos));
    }

    @Test public void withoutDropsOnePhoto() {
        assertEquals(ids(range(0, 2)), ids(PhotoList.without(range(0, 3), "p2")));
    }

    @Test public void keepsHeartsThroughJson() throws Exception {
        java.util.List<Feed.Photo> one = new java.util.ArrayList<>();
        one.add(new Feed.Photo("a", "/a", "Kate", "KA", 5, 99, true));
        PhotoList back = FeedParser.parsePhotoList(new PhotoList("v", one).toJson());
        assertEquals(99, back.photos.get(0).lovableUntil);
        assertTrue(back.photos.get(0).loved);
    }
}

