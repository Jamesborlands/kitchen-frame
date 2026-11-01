package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.json.JSONObject;
import org.junit.Test;

public class CheckinBodyTest {
    @Test public void sendsEveryKeyWithNullsAsNull() throws Exception {
        JSONObject j = new JSONObject(CheckinBody.json(3, 60, null, 300, null, false, null));
        assertEquals(7, j.length());
        assertEquals(3, j.getInt("versionCode"));
        assertTrue(j.has("lastFeedOkAt") && j.isNull("lastFeedOkAt"));
        assertTrue(j.has("wifiRssi") && j.isNull("wifiRssi"));
        assertTrue(j.has("lastError") && j.isNull("lastError"));
        assertFalse(j.getBoolean("tailscaleUp"));
    }
    @Test public void sendsValues() throws Exception {
        JSONObject j = new JSONObject(CheckinBody.json(3, 60, 99L, 300, -55, true, "boom"));
        assertEquals(99L, j.getLong("lastFeedOkAt"));
        assertEquals(-55, j.getInt("wifiRssi"));
        assertEquals("boom", j.getString("lastError"));
    }
    @Test public void readsTheCommand() {
        assertEquals("update", CheckinBody.command("{\"command\":\"update\"}"));
        assertNull(CheckinBody.command("{\"command\":null}"));
        assertNull(CheckinBody.command("not json"));
    }
}
