package com.cottageview.kitchen.core;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** The kitchen's own Wi-Fi screen: nearby networks, one row each (the frame has no Back button to leave Android's). */
public final class Wifi {
    private Wifi() {}

    public enum Security { OPEN, WEP, WPA }

    /** One scan result, as Android reports it. */
    public static final class Seen {
        final String ssid, caps; final int level;
        public Seen(String ssid, int level, String caps) { this.ssid = ssid; this.level = level; this.caps = caps == null ? "" : caps; }
    }

    public static final class Network {
        public final String ssid; public final int level; public final Security security; public final boolean connected, saved;
        Network(String ssid, int level, Security security, boolean connected, boolean saved) {
            this.ssid = ssid; this.level = level; this.security = security; this.connected = connected; this.saved = saved;
        }
        /** A network the frame has joined before needs no password: it's remembered. */
        public boolean needsPassword() { return security != Security.OPEN && !saved; }
    }

    public static Security security(String caps) {
        if (caps.contains("WPA")) return Security.WPA;
        if (caps.contains("WEP")) return Security.WEP;
        return Security.OPEN;
    }

    /** One row per network name, the strongest access point's signal; the connected one first, then strongest. */
    public static List<Network> networks(List<Seen> seen, String connectedSsid) {
        return networks(seen, connectedSsid, java.util.Collections.<String>emptySet());
    }

    /** `saved`: the networks the frame remembers (joined before). */
    public static List<Network> networks(List<Seen> seen, String connectedSsid, java.util.Set<String> saved) {
        Map<String, Seen> best = new LinkedHashMap<>();
        for (Seen s : seen) {
            if (s.ssid == null || s.ssid.trim().isEmpty()) continue;
            Seen b = best.get(s.ssid);
            if (b == null || s.level > b.level) best.put(s.ssid, s);
        }
        List<Network> out = new ArrayList<>();
        for (Seen s : best.values()) out.add(new Network(s.ssid, s.level, security(s.caps), s.ssid.equals(connectedSsid), saved.contains(s.ssid)));
        Collections.sort(out, new Comparator<Network>() {
            @Override public int compare(Network a, Network b) {
                if (a.connected != b.connected) return a.connected ? -1 : 1;
                return b.level - a.level;
            }
        });
        return out;
    }

    /** 1–4 bars from the signal level (dBm). */
    public static int bars(int level) { return level >= -55 ? 4 : level >= -67 ? 3 : level >= -78 ? 2 : 1; }

    /** Android gives the connected network's name in quotes, or "<unknown ssid>". */
    public static String unquote(String ssid) {
        if (ssid == null || ssid.isEmpty() || ssid.equals("<unknown ssid>") || ssid.equals("0x")) return null;
        return ssid.length() >= 2 && ssid.startsWith("\"") && ssid.endsWith("\"") ? ssid.substring(1, ssid.length() - 1) : ssid;
    }
}
