package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class RemoteShowTest {
    @Test public void showCommandsNameAPanel() {
        assertEquals("CALENDAR", RemoteShow.panel("show-calendar"));
        assertEquals("TODAY", RemoteShow.panel("show-todo"));
        assertEquals("WIFI", RemoteShow.panel("show-wifi"));
        assertEquals("WEATHER", RemoteShow.panel("show-weather"));
        assertNull(RemoteShow.panel("show-nothing"));
        assertNull(RemoteShow.panel("screenshot"));
    }
}
