package com.cottageview.kitchen.core;

import java.util.Collections;
import java.util.List;

/** The kitchen feed (lib/kitchen/feed/types.ts), parsed. Absent sections are null; lists are never null. */
public final class Feed {
    public static final int VERSION = 1;

    public final long generatedAt;
    public final String serverVersion;
    public final Weather weather;
    public final Warning warning;
    public final List<Clock> clocks;
    public final int sleepStartHour, sleepEndHour;
    public final List<Notice> notices;
    public final long noticeRotateMs;
    public final List<Photo> photos;
    public final long photoSlideMs;
    public final Board board;
    public final int nightStartHour, nightEndHour;
    public final String nightTimeZone;
    public final int latestVersionCode, minVersionCode;
    /** "smart" | "whole" | "fill" — see PhotoFit */
    public final String photoFit;
    /** Fingerprint of the full photo list (GET /api/kitchen/photos); null from older servers. */
    public final String photosVersion;
    /** "Happening today" (null from older servers: the notice card stands in). */
    public final Today today;
    public final List<Todo> todos;
    /** Gentle notices for the Today card's rotating line. */
    public final List<Notice> tips;
    /** Which parts of the screen this household has on (all of them from an older server). */
    public final Modules modules;

    public Feed(long generatedAt, String serverVersion, Weather weather, Warning warning, List<Clock> clocks,
                int sleepStartHour, int sleepEndHour, List<Notice> notices, long noticeRotateMs,
                List<Photo> photos, long photoSlideMs, Board board, int nightStartHour, int nightEndHour,
                String nightTimeZone, int latestVersionCode, int minVersionCode, String photoFit, String photosVersion,
                Today today, List<Todo> todos, List<Notice> tips) {
        this(generatedAt, serverVersion, weather, warning, clocks, sleepStartHour, sleepEndHour, notices, noticeRotateMs,
            photos, photoSlideMs, board, nightStartHour, nightEndHour, nightTimeZone, latestVersionCode, minVersionCode,
            photoFit, photosVersion, today, todos, tips, Modules.ALL);
    }

    public Feed(long generatedAt, String serverVersion, Weather weather, Warning warning, List<Clock> clocks,
                int sleepStartHour, int sleepEndHour, List<Notice> notices, long noticeRotateMs,
                List<Photo> photos, long photoSlideMs, Board board, int nightStartHour, int nightEndHour,
                String nightTimeZone, int latestVersionCode, int minVersionCode, String photoFit, String photosVersion,
                Today today, List<Todo> todos, List<Notice> tips, Modules modules) {
        this.generatedAt = generatedAt;
        this.serverVersion = serverVersion;
        this.weather = weather;
        this.warning = warning;
        this.clocks = Collections.unmodifiableList(clocks);
        this.sleepStartHour = sleepStartHour;
        this.sleepEndHour = sleepEndHour;
        this.notices = Collections.unmodifiableList(notices);
        this.noticeRotateMs = noticeRotateMs;
        this.photos = Collections.unmodifiableList(photos);
        this.photoSlideMs = photoSlideMs;
        this.board = board;
        this.nightStartHour = nightStartHour;
        this.nightEndHour = nightEndHour;
        this.nightTimeZone = nightTimeZone;
        this.latestVersionCode = latestVersionCode;
        this.minVersionCode = minVersionCode;
        this.photoFit = photoFit;
        this.photosVersion = photosVersion;
        this.today = today;
        this.todos = Collections.unmodifiableList(todos);
        this.tips = Collections.unmodifiableList(tips);
        this.modules = modules == null ? Modules.ALL : modules;
    }

    /** The Settings panel: the family page (link + QR) and the WhatsApp number. Null from older servers. */
    public Share share;
    /** What's on the frame, in short (changes when a photo or message arrives). Null from older servers. */
    public String latest;

    public static final class Share {
        public final String url, urlLabel, whatsapp;
        private final String[] qr;
        public Share(String url, String urlLabel, String whatsapp, String[] qr) { this.url = url; this.urlLabel = urlLabel; this.whatsapp = whatsapp; this.qr = qr; }
        public int size() { return qr.length; }
        public boolean dark(int row, int col) { return row < qr.length && col < qr[row].length() && qr[row].charAt(col) == '1'; }
    }

    private Feed carry(Feed f) { f.share = share; f.latest = latest; return f; }

    /** The household's module switches. */
    public static final class Modules {
        public static final Modules ALL = new Modules(true, true, true, true, true, true);
        public final boolean clocks, today, todos, rides, board, photos;
        public Modules(boolean clocks, boolean today, boolean todos, boolean rides, boolean board, boolean photos) {
            this.clocks = clocks; this.today = today; this.todos = todos; this.rides = rides; this.board = board; this.photos = photos;
        }
        public boolean sameAs(Modules o) {
            return o != null && clocks == o.clocks && today == o.today && todos == o.todos && rides == o.rides
                && board == o.board && photos == o.photos;
        }
    }

    /** The same feed showing a different photo list (the full list, or one with a photo just removed). */
    public Feed withPhotos(List<Photo> p) {
        return carry(new Feed(generatedAt, serverVersion, weather, warning, clocks, sleepStartHour, sleepEndHour, notices,
            noticeRotateMs, p, photoSlideMs, board, nightStartHour, nightEndHour, nightTimeZone, latestVersionCode,
            minVersionCode, photoFit, photosVersion, today, todos, tips, modules));
    }

    /** The same feed with the to-do list as this frame currently believes it (a tick shows at once). */
    public Feed withTodos(List<Todo> t) {
        return carry(new Feed(generatedAt, serverVersion, weather, warning, clocks, sleepStartHour, sleepEndHour, notices,
            noticeRotateMs, photos, photoSlideMs, board, nightStartHour, nightEndHour, nightTimeZone, latestVersionCode,
            minVersionCode, photoFit, photosVersion, today, t, tips, modules));
    }

    public static final class TodayItem {
        public final String time, text, kind;
        public final int color;
        public TodayItem(String time, String text, int color, String kind) { this.time = time; this.text = text; this.color = color; this.kind = kind; }
    }

    public static final class Today {
        public final String label;
        public final List<TodayItem> items, tomorrow;
        public Today(String label, List<TodayItem> items, List<TodayItem> tomorrow) {
            this.label = label; this.items = Collections.unmodifiableList(items); this.tomorrow = Collections.unmodifiableList(tomorrow);
        }
    }

    public static final class Todo {
        public final String id, text;
        public final boolean done;
        public Todo(String id, String text, boolean done) { this.id = id; this.text = text; this.done = done; }
    }

    public static final class Weather {
        public final String sceneUrl, summary, todayLine, uv, sun, moon;
        public final int tempC;
        public final long fetchedAt;
        public Weather(String sceneUrl, int tempC, String summary, String todayLine, String uv, String sun, String moon, long fetchedAt) {
            this.sceneUrl = sceneUrl; this.tempC = tempC; this.summary = summary; this.todayLine = todayLine;
            this.uv = uv; this.sun = sun; this.moon = moon; this.fetchedAt = fetchedAt;
        }
    }

    public static final class Warning {
        public final String level, title, detail;
        public final int bg, fg, dot;
        public Warning(String level, String title, String detail, int bg, int fg, int dot) {
            this.level = level; this.title = title; this.detail = detail; this.bg = bg; this.fg = fg; this.dot = dot;
        }
    }

    public static final class Clock {
        public final String key, label, sublabel, timeZone, sceneUrl, condition;
        public final Integer tempC;
        public Clock(String key, String label, String sublabel, String timeZone, String sceneUrl, Integer tempC, String condition) {
            this.key = key; this.label = label; this.sublabel = sublabel; this.timeZone = timeZone;
            this.sceneUrl = sceneUrl; this.tempC = tempC; this.condition = condition;
        }
    }

    public static final class Notice {
        public final String id, kind, eyebrow, headline, detail;
        public final int color;
        public Notice(String id, String kind, String eyebrow, String headline, String detail, int color) {
            this.id = id; this.kind = kind; this.eyebrow = eyebrow; this.headline = headline; this.detail = detail; this.color = color;
        }
    }

    public static final class Photo {
        public final String id, url, from, initials;
        public final long at;
        /** A ❤️ can go back on WhatsApp until this time (0: never); loved: one already has. */
        public final long lovableUntil;
        public final boolean loved;
        public Photo(String id, String url, String from, String initials, long at) {
            this(id, url, from, initials, at, 0, false);
        }
        public Photo(String id, String url, String from, String initials, long at, long lovableUntil, boolean loved) {
            this.id = id; this.url = url; this.from = from; this.initials = initials; this.at = at;
            this.lovableUntil = lovableUntil; this.loved = loved;
        }
    }

    public static final class Board {
        public final int rows, cols;
        public final long rotateMs;
        public final List<BoardPage> pages;
        public Board(int rows, int cols, long rotateMs, List<BoardPage> pages) {
            this.rows = rows; this.cols = cols; this.rotateMs = rotateMs; this.pages = Collections.unmodifiableList(pages);
        }
    }

    public static final class BoardPage {
        public final List<String> lines;
        public final String from, initials;
        public BoardPage(List<String> lines, String from, String initials) {
            this.lines = Collections.unmodifiableList(lines); this.from = from; this.initials = initials;
        }
    }
}
