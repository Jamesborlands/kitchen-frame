package com.cottageview.kitchen.core;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** GET /api/kitchen/route?id= — a ready-made route's line for the map. */
public final class RouteLine {
    public final String name;
    public final double distanceKm;
    public final int ascentM;
    public final double[] lat, lon;
    public final double south, west, north, east;

    private RouteLine(String name, double km, int ascent, double[] lat, double[] lon, double[] bbox) {
        this.name = name; this.distanceKm = km; this.ascentM = ascent; this.lat = lat; this.lon = lon;
        south = bbox[0]; west = bbox[1]; north = bbox[2]; east = bbox[3];
    }

    public static RouteLine parse(String json) throws FeedParser.BadFeed {
        try {
            JSONObject o = new JSONObject(json);
            JSONArray pts = o.getJSONArray("points"), bb = o.getJSONArray("bbox");
            double[] lat = new double[pts.length()], lon = new double[pts.length()];
            for (int i = 0; i < pts.length(); i++) {
                JSONArray p = pts.getJSONArray(i);
                lat[i] = p.getDouble(0);
                lon[i] = p.getDouble(1);
            }
            if (lat.length < 2 || bb.length() != 4) throw new JSONException("too short");
            return new RouteLine(o.optString("name"), o.optDouble("distanceKm", 0), o.optInt("ascentM"), lat, lon,
                new double[] { bb.getDouble(0), bb.getDouble(1), bb.getDouble(2), bb.getDouble(3) });
        } catch (JSONException e) {
            throw new FeedParser.BadFeed(e.getMessage());
        }
    }
}
