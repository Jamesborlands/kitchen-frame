package com.cottageview.kitchen.app;

import android.graphics.Bitmap;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.cottageview.kitchen.core.Backoff;
import com.cottageview.kitchen.core.DiskCache;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.core.FeedParser;
import com.cottageview.kitchen.core.FeedStore;
import com.cottageview.kitchen.core.ServerConfig;
import com.cottageview.kitchen.ui.KitchenView;
import java.io.File;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Keeps the kitchen alive: draws the cached feed first, polls the feed every
 * 60s (backing off on failure), and keeps the images the screen needs decoded
 * in memory — the scene, the clock thumbnails, and the current + next photo.
 */
public final class Controller {
    static final String TAG = "Kitchen";
    static final long POLL_MS = 60_000;

    final KitchenActivity activity;
    final KitchenView view;
    final Handler ui = new Handler(Looper.getMainLooper());
    final ExecutorService io = Executors.newSingleThreadExecutor();
    final ExecutorService img = Executors.newSingleThreadExecutor();
    // taps (remove, heart) get their own thread: never queued behind a slow poll or an APK download
    final ExecutorService actions = Executors.newSingleThreadExecutor();
    final Backoff backoff = new Backoff();
    final ServerConfig cfg;
    final FeedStore store;
    final DiskCache disk;
    Net net;
    volatile long lastFeedOkAt = -1;
    volatile String lastError;
    private boolean running;

    static final long CHECKIN_MS = 10 * 60_000, RELEASE_MS = 24 * 60 * 60_000;
    final long startedAt = android.os.SystemClock.elapsedRealtime();
    Updater updater;
    CommandRunner commands;
    long lastReleaseCheck;

    // decoded images, touched only on the UI thread. Bounded: with every family photo
    // in the slideshow, keeping each decoded photo (~2 MB) would run out of memory.
    final Map<String, Bitmap> mem = new com.cottageview.kitchen.core.Lru<>(16);
    final Map<String, Bitmap> blurs = new com.cottageview.kitchen.core.Lru<>(10);
    final Map<String, Bitmap> icons = new com.cottageview.kitchen.core.Lru<>(24); // small watercolour crops for the panels
    final Map<String, Bitmap> tiles = new com.cottageview.kitchen.core.Lru<>(40); // ride map tiles (256 px each)

    // every photo (GET /api/kitchen/photos), fetched when the feed's photosVersion changes; UI thread
    com.cottageview.kitchen.core.PhotoList photoList;
    private Feed lastFresh;
    private boolean fetchingPhotos;
    private final Set<String> removedHere = new HashSet<>(); // removed with the ✕ on this frame
    final Set<String> loading = new HashSet<>();
    final Map<String, Long> failedAt = new HashMap<>(); // don't hammer the server for an image that just failed
    static final long IMAGE_RETRY_MS = 60_000;

    Controller(KitchenActivity a, KitchenView v) {
        activity = a;
        view = v;
        cfg = ServerConfig.load(a.getFilesDir());
        store = new FeedStore(a.getFilesDir());
        disk = new DiskCache(new File(a.getCacheDir(), "img"), 80L * 1024 * 1024);
        v.setPhotoRemover(new KitchenView.PhotoRemover() {
            @Override public void remove(String id, KitchenView.PhotoRemover.Done done) { removePhoto(id, done); }
        });
        v.setTodoSender(new KitchenView.TodoSender() {
            @Override public void toggle(String id, boolean wasDone) { toggleTodo(id, wasDone); }
        });
        v.setHeartSender(new KitchenView.HeartSender() {
            @Override public void send(String id, KitchenView.HeartSender.Done done) { sendHeart(id, done); }
        });
        v.setPanelSource(new KitchenView.PanelSource() {
            @Override public com.cottageview.kitchen.core.Panels panels() { return panels; }
            @Override public void wantFresh() { fetchPanelsIfOlderThan(60_000); } // a panel just opened: show what's just been added
        });
        v.setImageSource(new KitchenView.ImageSource() {
            @Override public Bitmap scene(String url) { return image(url, 900, 700, false); }
            @Override public Bitmap photo(String url) { return image(url, 760, 600, true); }
            @Override public Bitmap blurred(String url) { image(url, 760, 600, true); return blurs.get(url); }
            @Override public Bitmap icon(String url) { return image(url, 160, 120, false, icons, "icon:" + url); }
            @Override public Bitmap tile(String url) { return image(url, 256, 256, false, tiles, "tile:" + url); }
        });
        v.setWifiControl(new WifiJoiner(a, io, ui));
        v.setExtras(new KitchenView.Extras() {
            @Override public java.util.List<com.cottageview.kitchen.core.Panels.AgendaDay> calendar(String from, int days) { return calendarPage(from, days); }
            @Override public com.cottageview.kitchen.core.RouteLine route(int id) { return routeLine(id); }
            @Override public void addTodo(String text) { Controller.this.addTodo(text); }
        });
    }

    void start() {
        running = true;
        ui.postDelayed(latestTask, LATEST_MS);
        photoList = loadPhotoList();
        loadPanels();
        String cached = store.load();
        if (cached != null) {
            try { show(FeedParser.parse(cached)); } catch (FeedParser.BadFeed e) { Log.w(TAG, "cached feed unreadable", e); }
        }
        io.execute(new Runnable() {
            @Override public void run() {
                try {
                    net = new Net(cfg, Net.tls(activity.getAssets().open("certs/isrg-root-x1.crt")));
                    updater = new Updater(activity, net);
                    commands = new CommandRunner(Controller.this, updater);
                    lockAdb();
                    ui.postDelayed(checkinTask, 30_000);
                } catch (Exception e) {
                    lastError = "tls: " + e;
                    Log.e(TAG, "tls setup failed", e);
                }
                ui.post(pollTask);
            }
        });
    }

    /** Drop adb from the LAN (the app keeps it over loopback). Re-applied at every start: rules don't survive a reboot. */
    private void lockAdb() {
        Root.Result r = Root.run(com.cottageview.kitchen.core.AdbLock.CLOSE, 10_000);
        if (r.exit != 0) Log.w(TAG, "couldn't lock adb down: " + r.out.trim());
    }

    /** Until when an openadb command keeps adb reachable from the LAN. */
    volatile long adbOpenUntil;

    /** Called 30 min after an openadb command. */
    void closeAdb() { io.execute(new Runnable() { @Override public void run() { lockAdb(); } }); }

    void stop() { running = false; ui.removeCallbacksAndMessages(null); }

    long lastFeedOkAt() { return lastFeedOkAt; }
    String lastError() { return lastError; }
    Net net() { return net; }
    Feed feed() { return view.feed(); }

    final Runnable pollTask = new Runnable() { @Override public void run() { pollNow(); } };

    /** Every 10 s: anything new (a photo or message just sent)? Then fetch the feed now, not at the next minute. */
    static final long LATEST_MS = 10_000;
    final Runnable latestTask = new Runnable() {
        @Override public void run() {
            if (!running) return;
            io.execute(new Runnable() {
                @Override public void run() {
                    try {
                        if (net != null && com.cottageview.kitchen.core.Latest.isNew(lastFresh, new String(net.get("/api/kitchen/latest"), "UTF-8"))) {
                            ui.post(new Runnable() { @Override public void run() { pollNow(); } });
                        }
                    } catch (Throwable e) {
                        Log.w(TAG, "latest", e); // the normal minute poll carries on regardless
                    }
                    ui.postDelayed(latestTask, LATEST_MS);
                }
            });
        }
    };

    void pollNow() {
        ui.removeCallbacks(pollTask);
        if (!running) return;
        io.execute(new Runnable() {
            @Override public void run() {
                long delay;
                try {
                    if (net == null) throw new java.io.IOException("no tls");
                    String json = new String(net.get("/api/kitchen/feed"), "UTF-8");
                    final Feed f = FeedParser.parse(json);
                    store.save(json);
                    lastFeedOkAt = System.currentTimeMillis();
                    lastError = null;
                    backoff.reset();
                    ui.post(new Runnable() { @Override public void run() { show(f); fetchPanelsIfOld(); } });
                    delay = POLL_MS;
                } catch (Exception e) {
                    // 401 = the server refused our frame key (rotated or wrong) — say so plainly in the check-in
                    lastError = e instanceof Net.HttpError && ((Net.HttpError) e).code == 401 ? "auth" : "feed: " + e;
                    Log.w(TAG, "feed poll failed", e);
                    delay = backoff.next();
                }
                ui.postDelayed(pollTask, delay);
            }
        });
    }

    final Runnable checkinTask = new Runnable() {
        @Override public void run() {
            if (!running) return;
            io.execute(new Runnable() {
                @Override public void run() {
                    String command = null;
                    // keep adb locked down (it may have failed at start if someone was connected), unless openadb is running
                    if (System.currentTimeMillis() >= adbOpenUntil) lockAdb();
                    try {
                        android.app.ActivityManager.MemoryInfo mi = new android.app.ActivityManager.MemoryInfo();
                        ((android.app.ActivityManager) activity.getSystemService(android.content.Context.ACTIVITY_SERVICE)).getMemoryInfo(mi);
                        android.net.wifi.WifiManager wm = (android.net.wifi.WifiManager) activity.getSystemService(android.content.Context.WIFI_SERVICE);
                        Integer rssi = wm != null && wm.getConnectionInfo() != null ? wm.getConnectionInfo().getRssi() : null;
                        boolean ts = com.cottageview.kitchen.core.ProcessList.has(Root.run("ps", 10_000).out, "tailscaled");
                        String body = com.cottageview.kitchen.core.CheckinBody.json(updater.currentVersion(),
                            (android.os.SystemClock.elapsedRealtime() - startedAt) / 1000,
                            lastFeedOkAt < 0 ? null : lastFeedOkAt, mi.availMem / (1024 * 1024), rssi, ts,
                            lastError != null ? lastError : updater.lastFailure);
                        String resp = new String(net.post("/api/kitchen/checkin", body.getBytes("UTF-8"), "application/json"), "UTF-8");
                        command = com.cottageview.kitchen.core.CheckinBody.command(resp);
                    } catch (Exception e) {
                        Log.w(TAG, "check-in failed", e);
                    }
                    if (command != null) commands.run(command);
                    long now = System.currentTimeMillis();
                    if (now - lastReleaseCheck > RELEASE_MS) { lastReleaseCheck = now; updater.checkAndInstall(); }
                }
            });
            ui.postDelayed(this, CHECKIN_MS);
        }
    };

    /** The feed says a newer version exists → try it now (a version that already failed: every 30 min). */
    void maybeUpdate(Feed f) {
        if (updater == null || f.latestVersionCode < 0 || !updater.wantsToTry(f.latestVersionCode)) return;
        io.execute(new Runnable() { @Override public void run() { updater.checkAndInstall(); } });
    }

    private void show(Feed fresh) {
        lastFresh = fresh;
        java.util.List<Feed.Photo> photos = com.cottageview.kitchen.core.PhotoList.merge(fresh.photos, photoList);
        for (String id : removedHere) photos = com.cottageview.kitchen.core.PhotoList.without(photos, id);
        if (!lovedHere.isEmpty()) {
            java.util.List<Feed.Photo> marked = new java.util.ArrayList<>(photos.size());
            for (Feed.Photo p : photos) {
                marked.add(lovedHere.contains(p.id) && !p.loved ? new Feed.Photo(p.id, p.url, p.from, p.initials, p.at, p.lovableUntil, true) : p);
            }
            photos = marked;
        }
        todos.settle(fresh.todos);
        Feed f = com.cottageview.kitchen.core.FeedMerge.keepWeather(view.feed(), fresh).withPhotos(photos).withTodos(todos.apply(fresh.todos));
        if (com.cottageview.kitchen.core.PhotoList.needsFetch(fresh.photosVersion, photoList)) fetchPhotos();
        com.cottageview.kitchen.ui.PhotoRenderer.setFit(com.cottageview.kitchen.core.PhotoFit.Mode.parse(f.photoFit));
        view.setFeed(f);
        activity.onFeed(f);
        // drop decoded images the new feed no longer uses
        Set<String> keep = new HashSet<>();
        if (f.weather != null) keep.add(f.weather.sceneUrl);
        for (Feed.Clock c : f.clocks) keep.add(c.sceneUrl);
        for (Feed.Photo p : f.photos) keep.add(p.url);
        mem.keySet().retainAll(keep);
        blurs.keySet().retainAll(keep);
    }

    private File photoListFile() { return new File(activity.getFilesDir(), "photos.json"); }

    private com.cottageview.kitchen.core.PhotoList loadPhotoList() {
        try {
            String s = ServerConfig.readUtf8(photoListFile());
            return s == null ? null : FeedParser.parsePhotoList(s);
        } catch (Throwable e) { // even an OutOfMemoryError: a bad file must never crash every start
            Log.w(TAG, "saved photo list unreadable — dropping it", e);
            if (!photoListFile().delete()) Log.w(TAG, "couldn't delete the photo list");
            return null;
        }
    }

    /** The feed says the photo list changed: fetch it (once at a time; a failure retries at the next poll). */
    private void fetchPhotos() {
        if (fetchingPhotos || net == null) return;
        fetchingPhotos = true;
        io.execute(new Runnable() {
            @Override public void run() {
                com.cottageview.kitchen.core.PhotoList got = null;
                try {
                    got = FeedParser.parsePhotoList(new String(net.get("/api/kitchen/photos"), "UTF-8"));
                    File tmp = new File(activity.getFilesDir(), "photos.json.tmp");
                    try (java.io.FileOutputStream o = new java.io.FileOutputStream(tmp)) { o.write(got.toJson().getBytes("UTF-8")); }
                    if (!tmp.renameTo(photoListFile())) Log.w(TAG, "couldn't save the photo list");
                } catch (Throwable e) { // incl. OOM: fetchingPhotos is reset below either way
                    Log.w(TAG, "photo list", e);
                }
                final com.cottageview.kitchen.core.PhotoList l = got;
                ui.post(new Runnable() {
                    @Override public void run() {
                        fetchingPhotos = false;
                        if (l == null) return;
                        photoList = l;
                        if (lastFresh != null) show(lastFresh);
                    }
                });
            }
        });
    }

    /** The ✕ on a photo: move it to the /family bin, and stop showing it here straight away. */
    void removePhoto(final String id, final KitchenView.PhotoRemover.Done done) {
        actions.execute(new Runnable() {
            @Override public void run() {
                boolean ok;
                try {
                    if (net == null) throw new java.io.IOException("no network yet");
                    byte[] body = new org.json.JSONObject().put("id", id).toString().getBytes("UTF-8");
                    net.post("/api/kitchen/photos/remove", body, "application/json");
                    ok = true;
                } catch (Net.HttpError e) {
                    ok = e.code == 404; // already gone
                } catch (Throwable e) {
                    Log.w(TAG, "remove photo", e);
                    ok = false;
                }
                final boolean removed = ok;
                ui.post(new Runnable() {
                    @Override public void run() {
                        if (removed) {
                            removedHere.add(id);
                            if (lastFresh != null) show(lastFresh);
                        }
                        done.done(removed);
                    }
                });
            }
        });
    }

    private Bitmap image(String url, int maxW, int maxH, boolean blur) { return image(url, maxW, maxH, blur, mem, url); }

    /** Returns the decoded image if ready; otherwise starts loading it (disk, then network) and returns null. */
    private Bitmap image(final String url, final int maxW, final int maxH, final boolean blur, final Map<String, Bitmap> store, final String key) {
        Bitmap b = store.get(key);
        if (b != null || loading.contains(key)) return b;
        Long failed = failedAt.get(key);
        if (failed != null && System.currentTimeMillis() - failed < IMAGE_RETRY_MS) return null;
        loading.add(key);
        img.execute(new Runnable() {
            @Override public void run() {
                Bitmap decoded = null, blurred = null;
                try {
                    File f = disk.get(url);
                    if (f == null && net != null) f = disk.put(url, net.get(url));
                    if (f != null) decoded = Images.decode(f, maxW, maxH);
                    if (blur) blurred = Images.blur(decoded);
                } catch (Throwable e) { // incl. OOM: the loading key is cleared below either way
                    Log.w(TAG, "image " + url, e);
                }
                final Bitmap d = decoded, bl = blurred;
                ui.post(new Runnable() {
                    @Override public void run() {
                        loading.remove(key);
                        if (d != null) {
                            failedAt.remove(key);
                            store.put(key, d);
                            if (bl != null) blurs.put(url, bl);
                            view.imagesChanged();
                        } else {
                            failedAt.put(key, System.currentTimeMillis()); // retried after IMAGE_RETRY_MS, when next drawn
                        }
                    }
                });
            }
        });
        return null;
    }

    // ---- panels: GET /api/kitchen/panels, every 10 minutes and when a panel opens with older data ----

    static final long PANELS_MS = 10 * 60_000;
    private com.cottageview.kitchen.core.Panels panels;
    private long panelsAt;
    private boolean fetchingPanels;

    private File panelsFile() { return new File(activity.getFilesDir(), "panels.json"); }

    private void loadPanels() {
        try {
            String s = ServerConfig.readUtf8(panelsFile());
            if (s != null) { panels = com.cottageview.kitchen.core.Panels.parse(s); panelsAt = panelsFile().lastModified(); }
        } catch (Throwable e) {
            Log.w(TAG, "saved panels unreadable — dropping them", e);
            if (!panelsFile().delete()) Log.w(TAG, "couldn't delete the saved panels");
        }
    }

    void fetchPanelsIfOld() { fetchPanelsIfOlderThan(PANELS_MS); }

    void fetchPanelsIfOlderThan(long ms) {
        long age = System.currentTimeMillis() - panelsAt;
        if (fetchingPanels || net == null || (age >= 0 && age < ms)) return; // a negative age (clock moved back) counts as old
        fetchingPanels = true;
        io.execute(new Runnable() {
            @Override public void run() {
                com.cottageview.kitchen.core.Panels got = null;
                try {
                    String json = new String(net.get("/api/kitchen/panels"), "UTF-8");
                    got = com.cottageview.kitchen.core.Panels.parse(json);
                    File tmp = new File(activity.getFilesDir(), "panels.json.tmp");
                    try (java.io.FileOutputStream o = new java.io.FileOutputStream(tmp)) { o.write(json.getBytes("UTF-8")); }
                    if (!tmp.renameTo(panelsFile())) Log.w(TAG, "couldn't save panels");
                } catch (Throwable e) { // incl. OOM: fetchingPanels is reset below either way
                    Log.w(TAG, "panels", e);
                }
                final com.cottageview.kitchen.core.Panels p = got;
                ui.post(new Runnable() {
                    @Override public void run() {
                        fetchingPanels = false;
                        if (p == null) return;
                        panels = p;
                        panelsAt = System.currentTimeMillis();
                        view.panelsChanged();
                    }
                });
            }
        });
    }

    // ---- to-dos: a tick shows at once, then POST /api/kitchen/todos/toggle ----

    private final com.cottageview.kitchen.core.Todos todos = new com.cottageview.kitchen.core.Todos();

    // ---- the full calendar and the ride map: fetched when a panel shows them ----

    static final long CALENDAR_FRESH_MS = 5 * 60_000;
    private final Map<String, java.util.List<com.cottageview.kitchen.core.Panels.AgendaDay>> calendarPages = new com.cottageview.kitchen.core.Lru<>(6);
    private final Map<String, Long> calendarAt = new HashMap<>();
    private final Map<Integer, com.cottageview.kitchen.core.RouteLine> routes = new HashMap<>();
    private final Set<String> fetching = new HashSet<>();

    /** A calendar page if we have it (refetched when over 5 minutes old); null the first time, while it loads. */
    java.util.List<com.cottageview.kitchen.core.Panels.AgendaDay> calendarPage(final String from, final int days) {
        final String key = from + "/" + days;
        Long at = calendarAt.get(key);
        boolean fresh = at != null && System.currentTimeMillis() - at < CALENDAR_FRESH_MS;
        if (!fresh) fetchJson("cal:" + key, "/api/kitchen/calendar?from=" + from + "&days=" + days, new Parsed() {
            @Override public void got(String json) throws Exception {
                calendarPages.put(key, com.cottageview.kitchen.core.Panels.parseDays(json));
                calendarAt.put(key, System.currentTimeMillis());
            }
        });
        return calendarPages.get(key);
    }

    com.cottageview.kitchen.core.RouteLine routeLine(final int id) {
        com.cottageview.kitchen.core.RouteLine r = routes.get(id);
        if (r == null) fetchJson("route:" + id, "/api/kitchen/route?id=" + id, new Parsed() {
            @Override public void got(String json) throws Exception { routes.put(id, com.cottageview.kitchen.core.RouteLine.parse(json)); }
        });
        return r;
    }

    interface Parsed { void got(String json) throws Exception; }

    /** GET in the background; `p` runs on the UI thread with the body, then the view redraws. One fetch per key at a time. */
    private void fetchJson(final String key, final String path, final Parsed p) {
        if (net == null || fetching.contains(key)) return;
        Long failed = failedAt.get(key);
        if (failed != null && System.currentTimeMillis() - failed < 20_000) return; // don't hammer after a failure
        fetching.add(key);
        io.execute(new Runnable() {
            @Override public void run() {
                String body = null;
                try { body = new String(net.get(path), "UTF-8"); } catch (Throwable e) { Log.w(TAG, path, e); }
                final String json = body;
                ui.post(new Runnable() {
                    @Override public void run() {
                        fetching.remove(key);
                        try {
                            if (json == null) throw new java.io.IOException("no body");
                            p.got(json);
                            failedAt.remove(key);
                        } catch (Throwable e) {
                            Log.w(TAG, "bad " + path, e);
                            failedAt.put(key, System.currentTimeMillis());
                        }
                        view.imagesChanged();
                    }
                });
            }
        });
    }

    // ---- to-dos: adding one on the frame, ticking one ----

    void addTodo(final String text) {
        actions.execute(new Runnable() {
            @Override public void run() {
                boolean ok;
                try {
                    if (net == null) throw new java.io.IOException("no network yet");
                    net.post("/api/kitchen/todos/add", new org.json.JSONObject().put("text", text).toString().getBytes("UTF-8"), "application/json");
                    ok = true;
                } catch (Throwable e) {
                    Log.w(TAG, "todo add", e);
                    ok = false;
                }
                final boolean sent = ok;
                ui.post(new Runnable() {
                    @Override public void run() {
                        if (sent) pollNow(); // the list as the server now has it
                        else lastError = "to-do didn't send";
                    }
                });
            }
        });
    }

    void toggleTodo(final String id, final boolean wasDone) {
        todos.tapped(id, wasDone);
        if (lastFresh != null) show(lastFresh);
        actions.execute(new Runnable() {
            @Override public void run() {
                boolean ok;
                try {
                    if (net == null) throw new java.io.IOException("no network yet");
                    net.post("/api/kitchen/todos/toggle", new org.json.JSONObject().put("id", id).toString().getBytes("UTF-8"), "application/json");
                    ok = true;
                } catch (Throwable e) {
                    Log.w(TAG, "todo toggle", e);
                    ok = false;
                }
                final boolean sent = ok;
                ui.post(new Runnable() {
                    @Override public void run() {
                        if (sent) { pollNow(); return; } // fetch the list the server now has
                        todos.tapped(id, !wasDone); // didn't reach the server: put the tick back how it was
                        lastError = "to-do tick didn't send";
                        if (lastFresh != null) show(lastFresh);
                    }
                });
            }
        });
    }

    // ---- hearts: POST /api/kitchen/photos/love → a ❤️ reaction on the sender's WhatsApp message ----

    private final Set<String> lovedHere = new HashSet<>();

    void sendHeart(final String id, final KitchenView.HeartSender.Done done) {
        actions.execute(new Runnable() {
            @Override public void run() {
                String failure = null;
                try {
                    if (net == null) throw new java.io.IOException("no network yet");
                    byte[] body = new org.json.JSONObject().put("id", id).toString().getBytes("UTF-8");
                    net.post("/api/kitchen/photos/love", body, "application/json");
                } catch (Net.HttpError e) {
                    failure = e.code == 409 ? "Too late for a heart — WhatsApp allows one in the day after a photo arrives."
                        : e.code == 503 ? "Hearts aren't switched on yet."
                        : "Couldn't send the heart just now.";
                } catch (Throwable e) {
                    Log.w(TAG, "heart", e);
                    failure = "Couldn't send the heart just now.";
                }
                final String f = failure;
                ui.post(new Runnable() {
                    @Override public void run() {
                        if (f == null) {
                            lovedHere.add(id);
                            if (lastFresh != null) show(lastFresh);
                        }
                        done.done(f == null, f);
                    }
                });
            }
        });
    }
}
