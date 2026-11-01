package com.cottageview.kitchen.core;

import org.json.JSONObject;

/** GET /api/kitchen/latest every 10 s: is there something on the frame the feed we have doesn't show yet? */
public final class Latest {
    private Latest() {}

    public static boolean isNew(Feed shown, String json) {
        if (shown == null || shown.latest == null) return false; // an older server: wait for the normal poll
        try {
            String now = new JSONObject(json).optString("latest", null);
            return now != null && !now.equals(shown.latest);
        } catch (Exception e) {
            return false;
        }
    }
}
