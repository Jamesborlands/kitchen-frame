package com.cottageview.kitchen.ui;

import com.cottageview.kitchen.core.CalendarGrid;
import com.cottageview.kitchen.core.Keyboard;
import com.cottageview.kitchen.core.Panels;
import com.cottageview.kitchen.core.RouteLine;
import java.util.List;

/** What the panels' interactive parts are showing right now (set by KitchenView, drawn by PanelRenderer). */
final class ExtrasState {
    CalendarGrid grid;                  // the calendar's page
    List<Panels.AgendaDay> gridDays;    // its days (null while loading)
    String today;                       // YYYY-MM-DD where the household is
    boolean typing;                     // adding a to-do
    Keyboard keyboard;
    final Keyboard.Text typed = new Keyboard.Text();
    int routeId = -1;                   // the route open on the map (-1: the rides overview)
    RouteLine route;                    // its line (null while loading)
    ExtrasRenderer.Tiles tiles;
    // the Wi-Fi screen
    java.util.List<com.cottageview.kitchen.core.Wifi.Network> wifiNetworks;
    com.cottageview.kitchen.core.Wifi.Network wifiPick;     // typing its password
    final Keyboard.Text wifiTyped = new Keyboard.Text(false);
    Keyboard.Page wifiPage = Keyboard.Page.LETTERS;
    String wifiStatus;
    boolean wifiBusy;
}
