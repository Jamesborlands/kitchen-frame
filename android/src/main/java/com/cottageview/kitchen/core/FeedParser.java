package com.cottageview.kitchen.core;

import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * JSON → Feed. Section-tolerant: a section with a missing or wrong-typed
 * field comes back null (a list item is skipped), and the rest of the feed
 * still parses. Only invalid JSON or an unknown feedVersion is fatal.
 */
public final class FeedParser {
    private FeedParser() {}

    public static final class BadFeed extends Exception {
        public BadFeed(String m) { super(m); }
    }

    public static Feed parse(String json) throws BadFeed {
        JSONObject j;
        try { j = new JSONObject(json); } catch (JSONException e) { throw new BadFeed("not json: " + e.getMessage()); }
        if (j.optInt("feedVersion", -1) != Feed.VERSION) throw new BadFeed("feedVersion " + j.opt("feedVersion"));

        JSONObject sleep = j.optJSONObject("clockSleep");
        JSONObject night = j.optJSONObject("night");
        JSONObject app = j.optJSONObject("app");
        Feed f = new Feed(
            j.optLong("generatedAt", 0),
            optStr(j, "serverVersion"),
            weather(j.optJSONObject("weather")),
            warning(j.optJSONObject("warning")),
            clocks(j.optJSONArray("clocks")),
            sleep != null ? sleep.optInt("startHour", 23) : 23,
            sleep != null ? sleep.optInt("endHour", 7) : 7,
            notices(j.optJSONArray("notices")),
            j.optLong("noticeRotateMs", 9000),
            photos(j.optJSONArray("photos")),
            j.optLong("photoSlideMs", 20000),
            board(j.optJSONObject("board")),
            night != null ? night.optInt("startHour", 23) : 23,
            night != null ? night.optInt("endHour", 6) : 6,
            night != null && optStr(night, "timeZone") != null ? optStr(night, "timeZone") : "Europe/London",
            app != null ? intOr(app, "latestVersionCode", -1) : -1,
            app != null ? intOr(app, "minVersionCode", -1) : -1,
            optStr(j, "photoFit") != null ? optStr(j, "photoFit") : "smart",
            optStr(j, "photosVersion"),
            today(j.optJSONObject("today")),
            todos(j.optJSONArray("todos")),
            j.has("tips") ? notices(j.optJSONArray("tips")) : notices(j.optJSONArray("notices")),
            modules(j.optJSONObject("modules")));
        f.share = share(j.optJSONObject("share"));
        f.latest = optStr(j, "latest");
        return f;
    }

    static Feed.Share share(JSONObject o) {
        JSONArray q = o == null ? null : o.optJSONArray("qr");
        if (q == null || q.length() == 0) return null;
        String[] rows = new String[q.length()];
        for (int i = 0; i < rows.length; i++) rows[i] = q.optString(i, "");
        return new Feed.Share(o.optString("url"), o.optString("urlLabel"), o.isNull("whatsapp") ? null : o.optString("whatsapp", null), rows);
    }

    static Feed.Modules modules(JSONObject o) {
        if (o == null) return Feed.Modules.ALL;
        return new Feed.Modules(o.optBoolean("clocks", true), o.optBoolean("today", true), o.optBoolean("todos", true),
            o.optBoolean("rides", true), o.optBoolean("board", true), o.optBoolean("photos", true));
    }

    static Feed.Today today(JSONObject o) {
        if (o == null) return null;
        return new Feed.Today(o.optString("label", ""), todayItems(o.optJSONArray("items")), todayItems(o.optJSONArray("tomorrow")));
    }

    static List<Feed.TodayItem> todayItems(JSONArray a) {
        List<Feed.TodayItem> out = new ArrayList<>();
        for (int i = 0; a != null && i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null || o.optString("text", "").isEmpty()) continue;
            out.add(new Feed.TodayItem(o.optString("time", ""), o.optString("text"), Colors.parse(o.optString("color", null), 0xFF4E6A8E), o.optString("kind", "")));
        }
        return out;
    }

    static List<Feed.Todo> todos(JSONArray a) {
        List<Feed.Todo> out = new ArrayList<>();
        for (int i = 0; a != null && i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null || o.optString("id", "").isEmpty()) continue;
            out.add(new Feed.Todo(o.optString("id"), o.optString("text", ""), o.optBoolean("done", false)));
        }
        return out;
    }

    /** GET /api/kitchen/photos → { version, photos }. */
    public static PhotoList parsePhotoList(String json) throws BadFeed {
        try {
            JSONObject j = new JSONObject(json);
            String version = optStr(j, "version");
            if (version == null) throw new BadFeed("photo list without a version");
            return new PhotoList(version, photos(j.optJSONArray("photos")));
        } catch (org.json.JSONException e) {
            throw new BadFeed(e.getMessage());
        }
    }

    // ---- strict field readers: wrong type → JSONException → section dropped ----
    static String str(JSONObject o, String k) throws JSONException {
        Object v = o.get(k);
        if (!(v instanceof String)) throw new JSONException(k + " not a string");
        return (String) v;
    }
    static String strOrNull(JSONObject o, String k) throws JSONException {
        if (!o.has(k) || o.isNull(k)) return null;
        return str(o, k);
    }
    static int num(JSONObject o, String k) throws JSONException {
        Object v = o.get(k);
        if (!(v instanceof Number)) throw new JSONException(k + " not a number");
        return ((Number) v).intValue();
    }
    static long lng(JSONObject o, String k) throws JSONException {
        Object v = o.get(k);
        if (!(v instanceof Number)) throw new JSONException(k + " not a number");
        return ((Number) v).longValue();
    }
    static Integer numOrNull(JSONObject o, String k) throws JSONException {
        if (!o.has(k) || o.isNull(k)) return null;
        return num(o, k);
    }
    static String optStr(JSONObject o, String k) {
        return o.isNull(k) ? null : (o.opt(k) instanceof String ? (String) o.opt(k) : null);
    }
    static int intOr(JSONObject o, String k, int dflt) {
        Object v = o.opt(k);
        return v instanceof Number ? ((Number) v).intValue() : dflt;
    }

    static Feed.Weather weather(JSONObject o) {
        if (o == null) return null;
        try {
            return new Feed.Weather(str(o, "sceneUrl"), num(o, "tempC"), str(o, "summary"), str(o, "todayLine"),
                str(o, "uv"), str(o, "sun"), str(o, "moon"), lng(o, "fetchedAt"));
        } catch (JSONException e) { return null; }
    }

    static Feed.Warning warning(JSONObject o) {
        if (o == null) return null;
        try {
            return new Feed.Warning(str(o, "level"), str(o, "title"), str(o, "detail"),
                Colors.parse(str(o, "bg"), 0xFFF2E5CF), Colors.parse(str(o, "fg"), 0xFF7E5622), Colors.parse(str(o, "dot"), 0xFFC0833A));
        } catch (JSONException e) { return null; }
    }

    static List<Feed.Clock> clocks(JSONArray a) {
        List<Feed.Clock> out = new ArrayList<>();
        if (a == null) return out;
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            try {
                out.add(new Feed.Clock(str(o, "key"), str(o, "label"), str(o, "sublabel"), str(o, "timeZone"),
                    str(o, "sceneUrl"), numOrNull(o, "tempC"), strOrNull(o, "condition")));
            } catch (JSONException e) { /* skip this clock */ }
        }
        return out;
    }

    static List<Feed.Notice> notices(JSONArray a) {
        List<Feed.Notice> out = new ArrayList<>();
        if (a == null) return out;
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            try {
                out.add(new Feed.Notice(str(o, "id"), str(o, "kind"), str(o, "eyebrow"), str(o, "headline"),
                    strOrNull(o, "detail"), Colors.parse(str(o, "color"), 0xFF6B7C6B)));
            } catch (JSONException e) { /* skip */ }
        }
        return out;
    }

    static List<Feed.Photo> photos(JSONArray a) {
        List<Feed.Photo> out = new ArrayList<>();
        if (a == null) return out;
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            try {
                out.add(new Feed.Photo(str(o, "id"), str(o, "url"), str(o, "from"), str(o, "initials"), lng(o, "at"),
                    o.optLong("lovableUntil", 0), o.optBoolean("loved", false)));
            } catch (JSONException e) { /* skip */ }
        }
        return out;
    }

    static Feed.Board board(JSONObject o) {
        if (o == null) return null;
        try {
            JSONArray pa = o.getJSONArray("pages");
            List<Feed.BoardPage> pages = new ArrayList<>();
            for (int i = 0; i < pa.length(); i++) {
                JSONObject p = pa.getJSONObject(i);
                JSONArray la = p.getJSONArray("lines");
                List<String> lines = new ArrayList<>();
                for (int k = 0; k < la.length(); k++) lines.add(la.getString(k));
                pages.add(new Feed.BoardPage(lines, str(p, "from"), str(p, "initials")));
            }
            if (pages.isEmpty()) return null;
            return new Feed.Board(num(o, "rows"), num(o, "cols"), lng(o, "rotateMs"), pages);
        } catch (JSONException e) { return null; }
    }
}
