package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class WifiTest {
    static Wifi.Seen seen(String ssid, int level, String caps) { return new Wifi.Seen(ssid, level, caps); }

    @Test public void oneRowPerNetworkStrongestFirstTheConnectedOneOnTop() {
        List<Wifi.Network> l = Wifi.networks(Arrays.asList(
            seen("Jade", -70, "[WPA2-PSK-CCMP][ESS]"),
            seen("Pebblesrocks", -60, "[WPA2-PSK-CCMP][WPS][ESS]"),
            seen("Jade", -50, "[WPA2-PSK-CCMP][ESS]"),   // the same network, another access point: keep the strongest
            seen("", -40, "[ESS]"),                       // hidden: not listed
            seen("Cafe", -80, "[ESS]")), "Pebblesrocks");
        assertEquals(Arrays.asList("Pebblesrocks", "Jade", "Cafe"), Arrays.asList(l.get(0).ssid, l.get(1).ssid, l.get(2).ssid));
        assertTrue(l.get(0).connected);
        assertEquals(-50, l.get(1).level);
        assertEquals(Wifi.Security.WPA, l.get(1).security);
        assertEquals(Wifi.Security.OPEN, l.get(2).security);
        assertFalse(l.get(2).needsPassword());
        assertEquals(Wifi.Security.WEP, Wifi.security("[WEP][ESS]"));
    }

    @Test public void signalBars() {
        assertEquals(4, Wifi.bars(-50));
        assertEquals(1, Wifi.bars(-88));
    }

    @Test public void theConnectedNameComesQuotedFromAndroid() {
        assertEquals("Pebblesrocks", Wifi.unquote("\"Pebblesrocks\""));
        assertNull(Wifi.unquote("<unknown ssid>"));
        assertNull(Wifi.unquote(null));
    }

    @Test public void aPasswordKeyboardHasCapitalsNumbersAndSymbols() {
        Layout.Box area = new Layout.Box(56, 300, 1310, 712);
        Keyboard lower = Keyboard.layout(area, Keyboard.Page.LETTERS);
        Keyboard.Text t = new Keyboard.Text(false); // a password: nothing capitalised for you
        t.press(lower.find("p"));
        t.press(lower.find("shift"));
        t.press(Keyboard.layout(area, Keyboard.Page.CAPITALS).find("A"));
        Keyboard sym = Keyboard.layout(area, Keyboard.Page.SYMBOLS);
        for (String k : new String[] {"1", "!", "@"}) t.press(sym.find(k));
        assertEquals("pA1!@", t.value());
        assertNotNull(sym.find("abc"));
        assertNotNull(lower.find("123"));
        for (Keyboard.Key k : sym.keys) assertTrue(k.label, k.box.inside(area));
        assertTrue("the shift key switches page", Keyboard.Text.pageAfter(lower.find("shift"), Keyboard.Page.LETTERS) == Keyboard.Page.CAPITALS);
        assertTrue(Keyboard.Text.pageAfter(sym.find("abc"), Keyboard.Page.SYMBOLS) == Keyboard.Page.LETTERS);
    }

    @Test public void theWifiScreenListsBigRows() {
        Layout.Box body = PanelLayout.compute(1366, 768).body;
        WifiPanelLayout l = WifiPanelLayout.compute(body, 12);
        assertTrue(l.rows.length >= 6);
        for (int i = 0; i < l.rows.length; i++) {
            assertTrue(l.rows[i].inside(body));
            assertTrue(l.rows[i].h() >= 56);
            if (i > 0) assertFalse(l.rows[i].overlaps(l.rows[i - 1]));
        }
        assertTrue(l.rescan.inside(body));
        assertEquals(3, l.rowAt((l.rows[3].l + l.rows[3].r) / 2, (l.rows[3].t + l.rows[3].b) / 2));
    }

    @Test public void aSavedNetworkJoinsWithOneTap() {
        java.util.Set<String> saved = new java.util.HashSet<>(Arrays.asList("Pebblesrocks"));
        List<Wifi.Network> l = Wifi.networks(Arrays.asList(
            seen("Pebblesrocks", -60, "[WPA2-PSK-CCMP][ESS]"), seen("Jade", -50, "[WPA2-PSK-CCMP][ESS]")), "Jade", saved);
        Wifi.Network pebbles = l.get(1);
        assertEquals("Pebblesrocks", pebbles.ssid);
        assertTrue(pebbles.saved);
        assertFalse("the frame knows its password already", pebbles.needsPassword());
        assertTrue(l.get(0).needsPassword() || l.get(0).connected);
    }
}

