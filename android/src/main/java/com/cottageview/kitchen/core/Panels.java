package com.cottageview.kitchen.core;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** GET /api/kitchen/panels — what the tap-to-open panels draw, already worded by the server. */
public final class Panels {
    public static final class Hour {
        public final String label, icon; public final int tempC, rainPct; // rainPct -1: not worth mentioning
        Hour(String label, int tempC, int rainPct, String icon) { this.label = label; this.tempC = tempC; this.rainPct = rainPct; this.icon = icon; }
    }
    public static final class Day {
        public final String label, icon; public final int maxC, minC;
        Day(String label, int maxC, int minC, String icon) { this.label = label; this.maxC = maxC; this.minC = minC; this.icon = icon; }
    }
    public static final class Now {
        public final int tempC, feelsC, uv; public final String condition, sunrise, sunset, icon;
        Now(int tempC, String condition, int feelsC, int uv, String sunrise, String sunset, String icon) {
            this.tempC = tempC; this.condition = condition; this.feelsC = feelsC; this.uv = uv; this.sunrise = sunrise; this.sunset = sunset; this.icon = icon;
        }
    }
    public static final class Place {
        public final String key, label, sublabel, timeZone, sceneUrl, extraTitle;
        public final Now now; public final List<Day> days; public final List<String> extraLines;
        Place(String key, String label, String sublabel, String timeZone, String sceneUrl, Now now, List<Day> days, String extraTitle, List<String> extraLines) {
            this.key = key; this.label = label; this.sublabel = sublabel; this.timeZone = timeZone; this.sceneUrl = sceneUrl;
            this.now = now; this.days = days; this.extraTitle = extraTitle; this.extraLines = extraLines;
        }
    }
    public static final class Note {
        public final String text, from; public final long at;
        Note(String text, String from, long at) { this.text = text; this.from = from; this.at = at; }
    }

    public static final class RideDay {
        public final String label, verdict; public final int tempC, rainMm;
        RideDay(String label, String verdict, int tempC, int rainMm) { this.label = label; this.verdict = verdict; this.tempC = tempC; this.rainMm = rainMm; }
    }
    public static final class Route {
        public final String name, kind; public final boolean drive; public final int id; // -1: an older server (no map)
        Route(int id, String name, String kind, boolean drive) { this.id = id; this.name = name; this.kind = kind; this.drive = drive; }
    }
    public static final class Rides {
        public final List<RideDay> days; public final String best, suggestionName, suggestionDistance, suggestionNote; public final List<Route> routes;
        Rides(List<RideDay> days, String best, String sn, String sd, String snote, List<Route> routes) {
            this.days = days; this.best = best; this.suggestionName = sn; this.suggestionDistance = sd; this.suggestionNote = snote; this.routes = routes;
        }
    }

    public final List<Hour> hours;
    public Rides rides; // null from older servers
    public static final class AgendaDay {
        public final String date, label; public final List<Feed.TodayItem> items;
        AgendaDay(String date, String label, List<Feed.TodayItem> items) { this.date = date; this.label = label; this.items = items; }
    }
    /** The calendar panel: the next two weeks, days with something on. */
    public List<AgendaDay> calendar = new ArrayList<>();
    public final List<Day> days;
    public final List<Place> places;
    public final List<Note> notes;

    Panels(List<Hour> hours, List<Day> days, List<Place> places, List<Note> notes) {
        this.hours = Collections.unmodifiableList(hours); this.days = Collections.unmodifiableList(days);
        this.places = Collections.unmodifiableList(places); this.notes = Collections.unmodifiableList(notes);
    }

    public Place place(String key) {
        for (Place p : places) if (p.key.equals(key)) return p;
        return null;
    }

    public static Panels parse(String json) throws FeedParser.BadFeed {
        try {
            JSONObject j = new JSONObject(json);
            JSONObject w = j.optJSONObject("weather");
            List<Place> places = new ArrayList<>();
            JSONArray pa = j.optJSONArray("places");
            for (int i = 0; pa != null && i < pa.length(); i++) {
                JSONObject o = pa.optJSONObject(i);
                if (o == null) continue;
                JSONObject n = o.optJSONObject("now"), x = o.optJSONObject("extra");
                List<String> lines = new ArrayList<>();
                JSONArray la = x == null ? null : x.optJSONArray("lines");
                for (int k = 0; la != null && k < la.length(); k++) lines.add(la.optString(k));
                places.add(new Place(o.optString("key"), o.optString("label"), o.optString("sublabel"), o.optString("timeZone", "UTC"),
                    o.optString("sceneUrl", null),
                    n == null ? null : new Now(n.optInt("tempC"), n.optString("condition"), n.optInt("feelsC"), n.optInt("uv"),
                        n.optString("sunrise"), n.optString("sunset"), n.optString("icon", "cloud")),
                    days(o.optJSONArray("days")), x == null ? null : x.optString("title"), lines));
            }
            List<Hour> hours = new ArrayList<>();
            JSONArray ha = w == null ? null : w.optJSONArray("hours");
            for (int i = 0; ha != null && i < ha.length(); i++) {
                JSONObject o = ha.optJSONObject(i);
                if (o != null) hours.add(new Hour(o.optString("label"), o.optInt("tempC"), o.isNull("rainPct") ? -1 : o.optInt("rainPct", -1), o.optString("icon", "cloud")));
            }
            List<Note> notes = new ArrayList<>();
            JSONArray na = j.optJSONArray("notes");
            for (int i = 0; na != null && i < na.length(); i++) {
                JSONObject o = na.optJSONObject(i);
                if (o != null) notes.add(new Note(o.optString("text"), o.optString("from"), o.optLong("at")));
            }
            Panels out = new Panels(hours, days(w == null ? null : w.optJSONArray("days")), places, notes);
            out.rides = rides(j.optJSONObject("rides"));
            JSONArray ca = j.optJSONArray("calendar");
            for (int i = 0; ca != null && i < ca.length(); i++) {
                JSONObject o = ca.optJSONObject(i);
                if (o != null) out.calendar.add(new AgendaDay(o.optString("date"), o.optString("label"), FeedParser.todayItems(o.optJSONArray("items"))));
            }
            return out;
        } catch (JSONException e) {
            throw new FeedParser.BadFeed(e.getMessage());
        }
    }

    /** GET /api/kitchen/calendar — every day of a month or week page. */
    public static List<AgendaDay> parseDays(String json) throws FeedParser.BadFeed {
        try {
            List<AgendaDay> out = new ArrayList<>();
            JSONArray a = new JSONObject(json).getJSONArray("days");
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.optJSONObject(i);
                if (o != null) out.add(new AgendaDay(o.optString("date"), o.optString("label"), FeedParser.todayItems(o.optJSONArray("items"))));
            }
            return out;
        } catch (JSONException e) {
            throw new FeedParser.BadFeed(e.getMessage());
        }
    }

    private static Rides rides(JSONObject r) {
        if (r == null) return null;
        List<RideDay> days = new ArrayList<>();
        JSONArray da = r.optJSONArray("days");
        for (int i = 0; da != null && i < da.length(); i++) {
            JSONObject o = da.optJSONObject(i);
            if (o != null) days.add(new RideDay(o.optString("label"), o.optString("verdict", "ok"), o.optInt("tempC"), o.optInt("rainMm")));
        }
        List<Route> routes = new ArrayList<>();
        JSONArray ra = r.optJSONArray("routes");
        for (int i = 0; ra != null && i < ra.length(); i++) {
            JSONObject o = ra.optJSONObject(i);
            if (o != null) routes.add(new Route(o.optInt("id", -1), o.optString("name"), o.optString("kind", ""), o.optBoolean("drive", false)));
        }
        JSONObject s = r.optJSONObject("suggestion");
        return new Rides(days, r.isNull("best") ? null : r.optString("best", null),
            s == null ? null : s.optString("name"), s == null ? "" : s.optString("distance", ""), s == null ? "" : s.optString("note", ""), routes);
    }

    private static List<Day> days(JSONArray a) {
        List<Day> out = new ArrayList<>();
        for (int i = 0; a != null && i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null) out.add(new Day(o.optString("label"), o.optInt("maxC"), o.optInt("minC"), o.optString("icon", "cloud")));
        }
        return out;
    }
}
