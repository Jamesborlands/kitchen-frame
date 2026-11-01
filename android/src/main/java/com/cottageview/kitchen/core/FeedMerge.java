package com.cottageview.kitchen.core;

/** A new feed with no weather keeps the previous weather (with its old fetchedAt → "updated Xh ago"). */
public final class FeedMerge {
    private FeedMerge() {}

    public static Feed keepWeather(Feed previous, Feed fresh) {
        if (previous == null || fresh.weather != null || previous.weather == null) return fresh;
        Feed f = new Feed(fresh.generatedAt, fresh.serverVersion, previous.weather, fresh.warning, fresh.clocks,
            fresh.sleepStartHour, fresh.sleepEndHour, fresh.notices, fresh.noticeRotateMs, fresh.photos,
            fresh.photoSlideMs, fresh.board, fresh.nightStartHour, fresh.nightEndHour, fresh.nightTimeZone,
            fresh.latestVersionCode, fresh.minVersionCode, fresh.photoFit, fresh.photosVersion, fresh.today, fresh.todos, fresh.tips, fresh.modules);
        f.share = fresh.share;
        f.latest = fresh.latest;
        return f;
    }
}
