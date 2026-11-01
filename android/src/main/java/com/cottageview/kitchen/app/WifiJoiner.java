package com.cottageview.kitchen.app;

import android.content.Context;
import android.net.wifi.ScanResult;
import android.net.wifi.SupplicantState;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Handler;
import android.util.Log;
import com.cottageview.kitchen.core.Wifi;
import com.cottageview.kitchen.ui.KitchenView;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;

/**
 * The kitchen's own Wi-Fi screen, behind the scenes: scan, list, join. A join that
 * doesn't work (a wrong password) is undone, and the frame goes back to the network
 * it was on — a typo must never leave the frame offline.
 */
final class WifiJoiner implements KitchenView.WifiControl {
    static final String TAG = "Kitchen";
    static final long JOIN_WAIT_MS = 25_000;

    private final WifiManager wm;
    private final ExecutorService io;
    private final Handler ui;

    WifiJoiner(Context c, ExecutorService io, Handler ui) {
        this.wm = (WifiManager) c.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        this.io = io;
        this.ui = ui;
    }

    /** Waits up to JOIN_WAIT_MS for network `id` to be connected with an address. */
    private boolean waitFor(int id) throws InterruptedException {
        wm.reconnect();
        long until = System.currentTimeMillis() + JOIN_WAIT_MS;
        while (System.currentTimeMillis() < until) {
            Thread.sleep(1000);
            WifiInfo now = wm.getConnectionInfo();
            if (now != null && now.getNetworkId() == id && now.getSupplicantState() == SupplicantState.COMPLETED && now.getIpAddress() != 0) return true;
        }
        return false;
    }

    @Override public List<Wifi.Network> networks() {
        try {
            List<Wifi.Seen> seen = new ArrayList<>();
            List<ScanResult> results = wm.getScanResults();
            if (results != null) for (ScanResult r : results) seen.add(new Wifi.Seen(r.SSID, r.level, r.capabilities));
            WifiInfo info = wm.getConnectionInfo();
            java.util.Set<String> saved = new java.util.HashSet<>();
            List<WifiConfiguration> configs = wm.getConfiguredNetworks();
            if (configs != null) for (WifiConfiguration c : configs) { String s = Wifi.unquote(c.SSID); if (s != null) saved.add(s); }
            return Wifi.networks(seen, info == null ? null : Wifi.unquote(info.getSSID()), saved);
        } catch (Exception e) {
            Log.w(TAG, "wifi list", e);
            return Collections.emptyList();
        }
    }

    @Override public void rescan() {
        try { wm.startScan(); } catch (Exception e) { Log.w(TAG, "wifi scan", e); }
    }

    @Override public void connect(final Wifi.Network n, final String password, final Done done) {
        io.execute(new Runnable() {
            @Override public void run() {
                boolean ok = false;
                WifiInfo before = wm.getConnectionInfo();
                int previous = before == null ? -1 : before.getNetworkId();
                int id = -1;
                boolean added = false;
                try {
                    String quoted = "\"" + n.ssid + "\"";
                    if (n.saved && password.isEmpty()) {
                        // joined before: Android remembers it, password and all
                        List<WifiConfiguration> known = wm.getConfiguredNetworks();
                        if (known != null) for (WifiConfiguration c : known) if (quoted.equals(c.SSID)) id = c.networkId;
                    }
                    if (id >= 0) {
                        // a remembered network: just switch to it
                        if (wm.enableNetwork(id, true)) ok = waitFor(id);
                    } else {
                        // a saved network of the same name (an old password) is replaced
                        List<WifiConfiguration> saved = wm.getConfiguredNetworks();
                        if (saved != null) for (WifiConfiguration c : saved) {
                            if (quoted.equals(c.SSID) && c.networkId != previous) wm.removeNetwork(c.networkId);
                        }
                        WifiConfiguration c = new WifiConfiguration();
                        c.SSID = quoted;
                        if (n.security == Wifi.Security.WPA) {
                            c.preSharedKey = "\"" + password + "\"";
                        } else if (n.security == Wifi.Security.WEP) {
                            c.wepKeys[0] = "\"" + password + "\"";
                            c.wepTxKeyIndex = 0;
                            c.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE);
                            c.allowedAuthAlgorithms.set(WifiConfiguration.AuthAlgorithm.OPEN);
                            c.allowedAuthAlgorithms.set(WifiConfiguration.AuthAlgorithm.SHARED);
                        } else {
                            c.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE);
                        }
                        id = wm.addNetwork(c);
                        added = id >= 0;
                        if (id >= 0 && wm.enableNetwork(id, true)) ok = waitFor(id);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "wifi join", e);
                } finally {
                    try {
                        if (ok) {
                            // switching disables every other saved network: turn them back on, so the
                            // frame falls back by itself if this one goes away (it stays on this one)
                            List<WifiConfiguration> all = wm.getConfiguredNetworks();
                            if (all != null) for (WifiConfiguration c : all) if (c.networkId != id) wm.enableNetwork(c.networkId, false);
                            wm.saveConfiguration();
                        } else {
                            // didn't work: forget it, and back to what was working
                            if (added) wm.removeNetwork(id); // a remembered network stays remembered
                            List<WifiConfiguration> all = wm.getConfiguredNetworks();
                            if (all != null) for (WifiConfiguration c : all) wm.enableNetwork(c.networkId, false);
                            if (previous >= 0) {
                                wm.enableNetwork(previous, true);
                                // …which disables the rest again: back on, so any saved network can still be a fallback
                                if (all != null) for (WifiConfiguration c : all) if (c.networkId != previous) wm.enableNetwork(c.networkId, false);
                            }
                            wm.reconnect();
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "wifi tidy", e);
                    }
                    Log.i(TAG, "wifi join " + n.ssid + ": " + (ok ? "ok" : "failed"));
                }
                final boolean result = ok;
                ui.post(new Runnable() { @Override public void run() { done.done(result); } });
            }
        });
    }
}
