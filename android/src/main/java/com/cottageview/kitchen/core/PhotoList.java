package com.cottageview.kitchen.core;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Every photo, from GET /api/kitchen/photos. The feed itself carries only the
 * newest FEED_PHOTOS; the frame fetches this list when the feed's photosVersion
 * changes, and keeps the last one on disk.
 */
public final class PhotoList {
    /** Must match FEED_PHOTOS in lib/kitchen/feed/sections.ts. */
    public static final int FEED_PHOTOS = 40;

    public final String version;
    public final List<Feed.Photo> photos;

    public PhotoList(String version, List<Feed.Photo> photos) {
        this.version = version;
        this.photos = Collections.unmodifiableList(new ArrayList<>(photos));
    }

    public static boolean needsFetch(String feedVersion, PhotoList cached) {
        return feedVersion != null && (cached == null || !feedVersion.equals(cached.version));
    }

    /**
     * What to show: the feed's newest photos always win (so a new photo shows at
     * once and a recent removal sticks, even if the full list is stale or failed to
     * download), then the full list's photos older than those. If the feed holds
     * fewer than FEED_PHOTOS, it already holds every photo.
     */
    public static List<Feed.Photo> merge(List<Feed.Photo> feed, PhotoList cached) {
        if (cached == null || feed.size() < FEED_PHOTOS) return feed;
        long oldest = Long.MAX_VALUE;
        Set<String> inFeed = new HashSet<>();
        for (Feed.Photo p : feed) { oldest = Math.min(oldest, p.at); inFeed.add(p.id); }
        List<Feed.Photo> out = new ArrayList<>(feed);
        for (Feed.Photo p : cached.photos) if (p.at < oldest && !inFeed.contains(p.id)) out.add(p);
        return out;
    }

    public static List<Feed.Photo> without(List<Feed.Photo> photos, String id) {
        List<Feed.Photo> out = new ArrayList<>(photos.size());
        for (Feed.Photo p : photos) if (!p.id.equals(id)) out.add(p);
        return out;
    }

    public String toJson() {
        try {
            JSONArray a = new JSONArray();
            for (Feed.Photo p : photos) {
                a.put(new JSONObject().put("id", p.id).put("url", p.url).put("from", p.from).put("initials", p.initials).put("at", p.at)
                    .put("lovableUntil", p.lovableUntil).put("loved", p.loved));
            }
            return new JSONObject().put("version", version).put("photos", a).toString();
        } catch (JSONException e) {
            throw new IllegalStateException(e);
        }
    }
}
