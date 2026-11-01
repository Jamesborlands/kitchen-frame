package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class PanelsTest {
    static final String JSON = "{\"generatedAt\":5,"
        + "\"weather\":{\"hours\":[{\"label\":\"now\",\"tempC\":14,\"rainPct\":null,\"icon\":\"rain\"},{\"label\":\"10am\",\"tempC\":15,\"rainPct\":70,\"icon\":\"rain\"}],"
        + "\"days\":[{\"label\":\"today\",\"maxC\":16,\"minC\":8,\"icon\":\"rain\"}]},"
        + "\"places\":[{\"key\":\"santaCruz\",\"label\":\"Santa Cruz\",\"sublabel\":\"Sam\",\"timeZone\":\"America/Los_Angeles\",\"sceneUrl\":\"/watercolor/place-santacruz-winter.webp\","
        + "\"now\":{\"tempC\":14,\"condition\":\"light rain\",\"feelsC\":13,\"uv\":1,\"sunrise\":\"7:23am\",\"sunset\":\"6:12pm\",\"icon\":\"rain\"},"
        + "\"days\":[],\"extra\":{\"title\":\"sea & surf\",\"lines\":[\"water 64°F\"]}},"
        + "{\"key\":\"ludlow\",\"label\":\"Ludlow\",\"sublabel\":\"Anne & Peter\",\"timeZone\":\"Europe/London\",\"sceneUrl\":\"/w.webp\",\"now\":null,\"days\":[],\"extra\":null}],"
        + "\"notes\":[{\"id\":\"n\",\"text\":\"see you sunday\",\"from\":\"Tom\",\"at\":9}]}";

    @Test public void parsesEverything() throws Exception {
        Panels p = Panels.parse(JSON);
        assertEquals(2, p.hours.size());
        assertEquals(-1, p.hours.get(0).rainPct);
        assertEquals(70, p.hours.get(1).rainPct);
        assertEquals("today", p.days.get(0).label);
        Panels.Place d = p.place("santaCruz");
        assertEquals("Santa Cruz", d.label);
        assertEquals("light rain", d.now.condition);
        assertEquals("sea & surf", d.extraTitle);
        assertEquals("water 64°F", d.extraLines.get(0));
        assertNull(p.place("ludlow").now);
        assertNull(p.place("ludlow").extraTitle);
        assertEquals("see you sunday", p.notes.get(0).text);
    }

    @Test public void noWeatherIsFine() throws Exception {
        Panels p = Panels.parse("{\"weather\":null,\"places\":[],\"notes\":[]}");
        assertTrue(p.hours.isEmpty());
        assertNull(p.place("x"));
    }

    @Test(expected = FeedParser.BadFeed.class)
    public void garbageIsBad() throws Exception { Panels.parse("<html>"); }

    @Test public void parsesRides() throws Exception {
        Panels p = Panels.parse("{\"places\":[],\"notes\":[],\"rides\":{\"days\":[{\"label\":\"today\",\"verdict\":\"good\",\"tempC\":17,\"rainMm\":0}],"
            + "\"best\":\"Wed\",\"suggestion\":{\"name\":\"Bentley Wood\",\"distance\":\"varies\",\"note\":\"Quiet forest tracks.\"},"
            + "\"routes\":[{\"name\":\"Whitcliffe loop\",\"kind\":\"chill ride\",\"drive\":false}]}}");
        assertEquals("good", p.rides.days.get(0).verdict);
        assertEquals("Wed", p.rides.best);
        assertEquals("Bentley Wood", p.rides.suggestionName);
        assertEquals("chill ride", p.rides.routes.get(0).kind);
        assertNull(Panels.parse("{\"places\":[],\"notes\":[]}").rides);
    }

    @Test public void parsesTheCalendarAgenda() throws Exception {
        Panels p = Panels.parse("{\"places\":[],\"notes\":[],\"calendar\":[{\"date\":\"2026-10-15\",\"label\":\"Thu 15 Oct\",\"items\":[{\"time\":\"all day\",\"text\":\"Bin day\",\"color\":\"#5E7E5E\",\"kind\":\"reminder\"}]}]}");
        assertEquals(1, p.calendar.size());
        assertEquals("Thu 15 Oct", p.calendar.get(0).label);
        assertEquals("Bin day", p.calendar.get(0).items.get(0).text);
        assertTrue(Panels.parse("{\"places\":[],\"notes\":[]}").calendar.isEmpty());
    }
}
