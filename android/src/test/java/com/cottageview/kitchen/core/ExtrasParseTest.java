package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class ExtrasParseTest {
    @Test public void aRouteLine() throws Exception {
        RouteLine r = RouteLine.parse("{\"name\":\"Whitcliffe loop\",\"distanceKm\":12.3,\"ascentM\":210,"
            + "\"points\":[[52.36,-2.72],[52.37,-2.73],[52.38,-2.71]],\"bbox\":[52.36,-2.73,52.38,-2.71]}");
        assertEquals("Whitcliffe loop", r.name);
        assertEquals(12.3, r.distanceKm, 0.001);
        assertEquals(210, r.ascentM);
        assertEquals(3, r.lat.length);
        assertEquals(-2.73, r.lon[1], 1e-9);
        assertEquals(52.38, r.north, 1e-9);
        assertEquals(-2.73, r.west, 1e-9);
    }

    @Test public void aBrokenRouteLineIsAnError() {
        try { RouteLine.parse("{\"name\":\"x\"}"); fail(); } catch (FeedParser.BadFeed expected) { /* ok */ }
    }

    @Test public void calendarDays() throws Exception {
        java.util.List<Panels.AgendaDay> d = Panels.parseDays("{\"from\":\"2026-10-01\",\"days\":["
            + "{\"date\":\"2026-10-01\",\"label\":\"Thu 1 Oct\",\"items\":[{\"time\":\"all day\",\"text\":\"Bins\",\"color\":\"#5E7E5E\",\"kind\":\"reminder\"}]},"
            + "{\"date\":\"2026-10-02\",\"label\":\"Fri 2 Oct\",\"items\":[]}]}");
        assertEquals(2, d.size());
        assertEquals("Bins", d.get(0).items.get(0).text);
        assertEquals(0, d.get(1).items.size());
    }
}
