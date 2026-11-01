package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class ShareTest {
    @Test public void parsesTheSettingsPanelsLinkNumberAndQr() throws Exception {
        String json = FeedParserTest.full().replaceFirst("\\}$",
            ",\"share\":{\"url\":\"https://x.dev/family\",\"urlLabel\":\"x.dev/family\",\"whatsapp\":\"+1 555-010-0199\",\"qr\":[\"101\",\"010\",\"111\"]}}");
        Feed.Share s = FeedParser.parse(json).share;
        assertEquals("x.dev/family", s.urlLabel);
        assertEquals("+1 555-010-0199", s.whatsapp);
        assertEquals(3, s.size());
        assertTrue(s.dark(0, 0));
        assertFalse(s.dark(0, 1));
        assertTrue(s.dark(2, 2));
    }

    @Test public void noNumberYetAndOlderServers() throws Exception {
        String json = FeedParserTest.full().replaceFirst("\\}$", ",\"share\":{\"url\":\"u\",\"urlLabel\":\"u\",\"whatsapp\":null,\"qr\":[\"1\"]}}");
        assertNull(FeedParser.parse(json).share.whatsapp);
        assertNull(FeedParser.parse(FeedParserTest.full()).share);
    }

    @Test public void settingsIsAlwaysOnTheSidebarAndFiveButtonsFit() {
        java.util.List<Layout.Rail> all = Layout.railButtons(Feed.Modules.ALL);
        assertEquals(Layout.Rail.SETTINGS, all.get(all.size() - 1));
        assertEquals(5, all.size());
        Layout.Boxes b = Layout.compute(1366, 768, true, false, 2, 18);
        for (int i = 0; i < all.size(); i++) assertTrue(Layout.railButton(b.rail, i).inside(b.rail));
        assertTrue(Layout.railButtons(new Feed.Modules(false, false, false, false, false, false)).contains(Layout.Rail.SETTINGS));
    }

    @Test public void theQrIsABigSquareBesideTheWords() {
        SharePanelLayout l = SharePanelLayout.compute(PanelLayout.compute(1366, 768).body);
        assertEquals(l.qr.w(), l.qr.h(), 0.5);
        assertTrue("big enough for a phone camera across the kitchen", l.qr.w() >= 380);
        assertTrue(l.text.l > l.qr.r);
    }

    @Test public void aBigWifiButtonUnderTheWords() {
        Layout.Box body = PanelLayout.compute(1366, 768).body;
        SharePanelLayout l = SharePanelLayout.compute(body);
        assertTrue(l.wifi.inside(body));
        assertTrue(l.wifi.l >= l.text.l);
        assertTrue("finger-sized", l.wifi.h() >= 64 && l.wifi.w() >= 260);
        assertTrue("below the words", l.wifi.t >= l.text.t + 420);
    }
}

