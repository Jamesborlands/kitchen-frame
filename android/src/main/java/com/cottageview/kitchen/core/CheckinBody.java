package com.cottageview.kitchen.core;

import org.json.JSONException;
import org.json.JSONObject;

/** The 10-minute check-in (app/api/kitchen/checkin). Every key is always present; unknowns are JSON null. */
public final class CheckinBody {
    private CheckinBody() {}

    public static String json(int versionCode, long uptimeS, Long lastFeedOkAt, long freeMemMb, Integer wifiRssi,
                              boolean tailscaleUp, String lastError) {
        try {
            return new JSONObject()
                .put("versionCode", versionCode)
                .put("uptimeS", uptimeS)
                .put("lastFeedOkAt", lastFeedOkAt == null ? JSONObject.NULL : lastFeedOkAt)
                .put("freeMemMb", freeMemMb)
                .put("wifiRssi", wifiRssi == null ? JSONObject.NULL : wifiRssi)
                .put("tailscaleUp", tailscaleUp)
                .put("lastError", lastError == null ? JSONObject.NULL : lastError)
                .toString();
        } catch (JSONException e) { throw new IllegalStateException(e); }
    }

    public static String command(String responseJson) {
        try {
            JSONObject j = new JSONObject(responseJson);
            return j.isNull("command") ? null : j.optString("command", null);
        } catch (JSONException e) { return null; }
    }
}
