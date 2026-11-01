package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.json.JSONObject;
import org.junit.Test;

public class FeedParserTest {
    static String full() {
        return "{\"feedVersion\":1,\"generatedAt\":100,\"serverVersion\":\"abc\","
            + "\"weather\":{\"sceneUrl\":\"/watercolor/rain.webp\",\"tempC\":15,\"summary\":\"light rain · feels 12°\","
            + "\"todayLine\":\"high 15° · low 8°\",\"uv\":\"uv 3\",\"sun\":\"↑ 07:22 · ↓ 18:21\",\"moon\":\"moon — new moon · 0% lit\",\"fetchedAt\":90},"
            + "\"warning\":{\"level\":\"amber\",\"title\":\"amber weather warning\",\"detail\":\"rain until Thu 25 Jun\",\"bg\":\"#F2E5CF\",\"fg\":\"#7E5622\",\"dot\":\"#C0833A\"},"
            + "\"clocks\":[{\"key\":\"ludlow\",\"label\":\"Ludlow\",\"sublabel\":\"Anne & Peter\",\"timeZone\":\"Europe/London\","
            + "\"sceneUrl\":\"/watercolor/place-ludlow-summer.webp\",\"tempC\":15,\"condition\":\"overcast\"},"
            + "{\"key\":\"queenstown\",\"label\":\"Queenstown\",\"sublabel\":\"Tom\",\"timeZone\":\"Pacific/Auckland\","
            + "\"sceneUrl\":\"/watercolor/place-queenstown-winter.webp\",\"tempC\":null,\"condition\":null}],"
            + "\"clockSleep\":{\"startHour\":23,\"endHour\":7},"
            + "\"notices\":[{\"id\":\"n\",\"kind\":\"quake\",\"eyebrow\":\"earthquake\",\"headline\":\"M5\",\"detail\":null,\"color\":\"#B0504A\"}],"
            + "\"noticeRotateMs\":9000,"
            + "\"photos\":[{\"id\":\"p\",\"url\":\"/api/photo?k=whatsapp/p.jpg\",\"from\":\"Kate\",\"initials\":\"KA\",\"at\":5}],"
            + "\"photoSlideMs\":20000,"
            + "\"board\":{\"rows\":2,\"cols\":18,\"rotateMs\":30000,\"pages\":[{\"lines\":[\"HELLO\",\"WORLD\"],\"from\":\"Sam\",\"initials\":\"SA\"}]},"
            + "\"night\":{\"startHour\":23,\"endHour\":6,\"timeZone\":\"Europe/London\"},"
            + "\"app\":{\"latestVersionCode\":4,\"minVersionCode\":1},"
            + "\"photoFit\":\"fill\"}";
    }

    @Test public void parsesEverySection() throws Exception {
        Feed f = FeedParser.parse(full());
        assertEquals(100, f.generatedAt);
        assertEquals("abc", f.serverVersion);
        assertEquals(15, f.weather.tempC);
        assertEquals(90, f.weather.fetchedAt);
        assertEquals("/watercolor/rain.webp", f.weather.sceneUrl);
        assertEquals(0xFFF2E5CF, f.warning.bg);
        assertEquals(2, f.clocks.size());
        assertEquals(Integer.valueOf(15), f.clocks.get(0).tempC);
        assertNull(f.clocks.get(1).tempC);
        assertNull(f.clocks.get(1).condition);
        assertEquals(23, f.sleepStartHour);
        assertEquals(7, f.sleepEndHour);
        assertNull(f.notices.get(0).detail);
        assertEquals(0xFFB0504A, f.notices.get(0).color);
        assertEquals(9000, f.noticeRotateMs);
        assertEquals("KA", f.photos.get(0).initials);
        assertEquals(20000, f.photoSlideMs);
        assertEquals(18, f.board.cols);
        assertEquals("WORLD", f.board.pages.get(0).lines.get(1));
        assertEquals(6, f.nightEndHour);
        assertEquals("Europe/London", f.nightTimeZone);
        assertEquals(4, f.latestVersionCode);
        assertEquals(1, f.minVersionCode);
        assertEquals("fill", f.photoFit);
    }

    @Test public void nullSectionsComeBackNullOrEmpty() throws Exception {
        JSONObject j = new JSONObject(full());
        j.put("weather", JSONObject.NULL).put("warning", JSONObject.NULL).put("board", JSONObject.NULL);
        j.put("app", new JSONObject().put("latestVersionCode", JSONObject.NULL).put("minVersionCode", JSONObject.NULL));
        j.remove("photos");
        Feed f = FeedParser.parse(j.toString());
        assertNull(f.weather);
        assertNull(f.warning);
        assertNull(f.board);
        assertTrue(f.photos.isEmpty());
        assertEquals(-1, f.latestVersionCode);
    }

    @Test public void aBrokenSectionOnlyCostsThatSection() throws Exception {
        JSONObject j = new JSONObject(full());
        j.getJSONObject("weather").put("tempC", "fifteen");
        j.put("board", "nonsense");
        j.put("somethingNew", 1);
        Feed f = FeedParser.parse(j.toString());
        assertNull(f.weather);
        assertNull(f.board);
        assertEquals(2, f.clocks.size());
    }

    @Test public void aBrokenListItemIsSkipped() throws Exception {
        JSONObject j = new JSONObject(full());
        j.getJSONArray("photos").put("not a photo");
        Feed f = FeedParser.parse(j.toString());
        assertEquals(1, f.photos.size());
    }

    @Test public void defaultsTimingsWhenMissing() throws Exception {
        JSONObject j = new JSONObject(full());
        j.remove("photoSlideMs"); j.remove("noticeRotateMs"); j.remove("night"); j.remove("clockSleep");
        Feed f = FeedParser.parse(j.toString());
        assertEquals(20000, f.photoSlideMs);
        assertEquals(9000, f.noticeRotateMs);
        assertEquals(23, f.nightStartHour);
        assertEquals(6, f.nightEndHour);
        assertEquals(23, f.sleepStartHour);
        j.remove("photoFit");
        assertEquals("smart", FeedParser.parse(j.toString()).photoFit); // older servers don't send it
    }

    @Test(expected = FeedParser.BadFeed.class) public void rejectsUnknownVersion() throws Exception {
        FeedParser.parse(new JSONObject(full()).put("feedVersion", 2).toString());
    }

    @Test(expected = FeedParser.BadFeed.class) public void rejectsJunk() throws Exception {
        FeedParser.parse("<html>");
    }

    @Test public void readsThePhotoListVersion() throws Exception {
        org.json.JSONObject j = new org.json.JSONObject(full());
        assertNull(FeedParser.parse(j.toString()).photosVersion); // older servers don't send one
        j.put("photosVersion", "abc123");
        assertEquals("abc123", FeedParser.parse(j.toString()).photosVersion);
    }

    @Test public void parsesTheFullPhotoList() throws Exception {
        PhotoList l = FeedParser.parsePhotoList("{\"version\":\"v1\",\"photos\":[{\"id\":\"a\",\"url\":\"/u\",\"from\":\"Kate\",\"initials\":\"KA\",\"at\":3}]}");
        assertEquals("v1", l.version);
        assertEquals("a", l.photos.get(0).id);
    }

    @Test(expected = FeedParser.BadFeed.class)
    public void aPhotoListWithoutAVersionIsBad() throws Exception {
        FeedParser.parsePhotoList("{\"photos\":[]}");
    }

    @Test public void readsTodayTodosAndTips() throws Exception {
        org.json.JSONObject j = new org.json.JSONObject(full());
        Feed old = FeedParser.parse(j.toString());
        assertNull(old.today);                    // older servers
        assertTrue(old.todos.isEmpty());
        assertEquals(old.notices.size(), old.tips.size()); // no tips: the notices stand in
        j.put("today", new org.json.JSONObject("{\"label\":\"Monday 12 October\",\"items\":[{\"time\":\"11am\",\"text\":\"Mum — tennis\",\"color\":\"#B0607A\",\"kind\":\"reminder\"}],\"tomorrow\":[{\"time\":\"all day\",\"text\":\"Tom in town\",\"color\":\"#5E7E5E\",\"kind\":\"reminder\"}]}"));
        j.put("todos", new org.json.JSONArray("[{\"id\":\"t1\",\"text\":\"Ring the plumber\",\"done\":false},{\"id\":\"t2\",\"text\":\"Stamps\",\"done\":true}]"));
        j.put("tips", new org.json.JSONArray());
        Feed f = FeedParser.parse(j.toString());
        assertEquals("Monday 12 October", f.today.label);
        assertEquals("11am", f.today.items.get(0).time);
        assertEquals(0xFFB0607A, f.today.items.get(0).color);
        assertEquals("Tom in town", f.today.tomorrow.get(0).text);
        assertEquals(2, f.todos.size());
        assertTrue(f.todos.get(1).done);
        assertTrue(f.tips.isEmpty());
    }
}
