package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.json.JSONObject;
import org.junit.Test;

public class FeedMergeTest {
    @Test public void keepsPreviousWeatherWhenTheNewFeedHasNone() throws Exception {
        Feed old = FeedParser.parse(FeedParserTest.full());
        Feed fresh = FeedParser.parse(new JSONObject(FeedParserTest.full()).put("weather", JSONObject.NULL).put("generatedAt", 200).toString());
        Feed merged = FeedMerge.keepWeather(old, fresh);
        assertSame(old.weather, merged.weather);
        assertEquals(200, merged.generatedAt);
        assertEquals(fresh.photos, merged.photos);
        assertEquals(fresh.photoFit, merged.photoFit);
    }
    @Test public void prefersNewWeather() throws Exception {
        Feed old = FeedParser.parse(FeedParserTest.full());
        Feed fresh = FeedParser.parse(FeedParserTest.full());
        assertSame(fresh, FeedMerge.keepWeather(old, fresh));
    }
    @Test public void noPreviousFeed() throws Exception {
        Feed fresh = FeedParser.parse(FeedParserTest.full());
        assertSame(fresh, FeedMerge.keepWeather(null, fresh));
    }
}
