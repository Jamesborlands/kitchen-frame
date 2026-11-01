package com.cottageview.kitchen.core;

/** "show-calendar" etc. from /kitchen/status: open that panel, screenshot it, close it (testing from afar). */
public final class RemoteShow {
    private RemoteShow() {}
    public static final long SETTLE_MS = 8_000; // time for the panel's data, map tiles and so on to arrive

    /** The panel kind's name (KitchenView.OpenPanel.Kind), or null if `command` isn't a show command. */
    public static String panel(String command) {
        if (command == null || !command.startsWith("show-")) return null;
        String p = command.substring(5);
        if (p.equals("weather")) return "WEATHER";
        if (p.equals("calendar")) return "CALENDAR";
        if (p.equals("todo")) return "TODAY";
        if (p.equals("rides")) return "RIDES";
        if (p.equals("messages")) return "MESSAGES";
        if (p.equals("settings")) return "SETTINGS";
        if (p.equals("wifi")) return "WIFI";
        return null;
    }
}
