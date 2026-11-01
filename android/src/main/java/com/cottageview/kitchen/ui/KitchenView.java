package com.cottageview.kitchen.ui;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.text.TextPaint;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.core.Layout;
import com.cottageview.kitchen.core.PanelLayout;
import com.cottageview.kitchen.core.PanelTimer;
import com.cottageview.kitchen.core.Panels;
import com.cottageview.kitchen.core.PhotoMenu;
import com.cottageview.kitchen.core.PhotoMenuLayout;
import com.cottageview.kitchen.core.Rotator;
import com.cottageview.kitchen.core.Swipe;
import com.cottageview.kitchen.core.TimeWindows;

/**
 * The whole kitchen screen. Each section that animates (notice, photo, flap
 * board) is its own child View, so an animation frame only re-records that
 * pane — on this A33 a full-screen redraw costs ~57ms of CPU, far too much to
 * do 60 times a second. The static pane (warning, labels, weather, clocks)
 * redraws only when the minute, the feed or an image changes.
 */
public final class KitchenView extends ViewGroup {
    public interface ImageSource {
        Bitmap scene(String url);
        Bitmap photo(String url);
        Bitmap blurred(String url);
        /** A small decode of a watercolour, for weather icons in the panels. */
        Bitmap icon(String url);
        /** A 256 px map tile for the ride map (null while it loads). */
        Bitmap tile(String url);
    }
    /** The kitchen's own Wi-Fi screen (Android's has no way back on this frame). */
    public interface WifiControl {
        java.util.List<com.cottageview.kitchen.core.Wifi.Network> networks();
        void rescan();
        interface Done { void done(boolean ok); }
        /** Joins `n` (with `password` unless it's open); `done` runs on the UI thread. */
        void connect(com.cottageview.kitchen.core.Wifi.Network n, String password, Done done);
    }
    /** The panels' fetch-on-demand parts: calendar pages, route lines, adding a to-do. */
    public interface Extras {
        /** The days from `from` (null while loading — the view is redrawn when they arrive). */
        java.util.List<com.cottageview.kitchen.core.Panels.AgendaDay> calendar(String from, int days);
        com.cottageview.kitchen.core.RouteLine route(int id);
        void addTodo(String text);
    }
    /** The panels' data (GET /api/kitchen/panels), and a nudge to refresh it if it's old. */
    public interface PanelSource {
        Panels panels();
        void wantFresh();
    }
    /** Sends a ❤️ back on WhatsApp (off the UI thread); reports on the UI thread with what to say if it failed. */
    public interface HeartSender {
        interface Done { void done(boolean ok, String failure); }
        void send(String id, Done done);
    }
    /** Ticks or unticks a to-do (off the UI thread). The view shows the tick at once. */
    public interface TodoSender { void toggle(String id, boolean wasDone); }
    /** Which panel is open over the kitchen. */
    public static final class OpenPanel {
        public enum Kind { WEATHER, PLACE, MESSAGES, TODAY, RIDES, CALENDAR, SETTINGS, WIFI }
        public final Kind kind;
        public final String placeKey, placeLabel;
        OpenPanel(Kind kind, String placeKey, String placeLabel) { this.kind = kind; this.placeKey = placeKey; this.placeLabel = placeLabel; }
    }
    public interface NightListener { void onNight(boolean night); }
    /** Moves a photo to the /family bin (off the UI thread) and reports back on the UI thread. */
    public interface PhotoRemover {
        interface Done { void done(boolean ok); }
        void remove(String id, Done done);
    }

    static final long TAP_WAKE_MS = 5 * 60_000L;
    /** After a swipe, the chosen photo stays this long before the slideshow carries on. */
    static final long SWIPE_HOLD_MS = 60_000L;
    /** A photo that's just arrived stays this long before the slideshow carries on. */
    static final long NEW_PHOTO_HOLD_MS = 2 * 60_000L;

    Feed feed;
    ImageSource images = new ImageSource() {
        public Bitmap scene(String u) { return null; }
        public Bitmap photo(String u) { return null; }
        public Bitmap blurred(String u) { return null; }
        public Bitmap icon(String u) { return null; }
        public Bitmap tile(String u) { return null; }
    };
    private PanelSource panelSource;
    private Extras extras;
    private WifiControl wifi;
    final ExtrasState x = new ExtrasState();
    private HeartSender heartSender;
    private TodoSender todoSender;
    OpenPanel openPanel;
    private final PanelTimer panelTimer = new PanelTimer();
    String heartFailure;
    private NightListener nightListener;
    private PhotoRemover remover;
    final PhotoMenu menu = new PhotoMenu();
    private Boolean wasNight;
    private long wakeUntil;
    private long lastMinute = -1;
    Layout.Boxes boxes;

    private final StaticPane staticPane;
    private final NoticePane noticePane;
    private final PhotoPane photoPane;
    private final BoardPane boardPane;
    private final NightPane nightPane;
    private final PanelPane panelPane;
    private final RailPane railPane;
    final com.cottageview.kitchen.core.Drawer drawer = new com.cottageview.kitchen.core.Drawer();

    public KitchenView(Context c) {
        super(c);
        setWillNotDraw(false);
        staticPane = new StaticPane(c);
        noticePane = new NoticePane(c);
        photoPane = new PhotoPane(c);
        boardPane = new BoardPane(c);
        nightPane = new NightPane(c);
        panelPane = new PanelPane(c);
        railPane = new RailPane(c);
        addView(staticPane);
        addView(noticePane);
        addView(photoPane);
        addView(boardPane);
        addView(railPane);
        addView(panelPane);
        addView(nightPane);
        nightPane.setVisibility(GONE);
        panelPane.setVisibility(GONE);
        railPane.setVisibility(GONE);
        post(ticker);
    }

    public void setFeed(Feed f) {
        boolean relayout = feed == null || (feed.warning == null) != (f.warning == null)
            || hasBoard(feed) != hasBoard(f) || !feed.modules.sameAs(f.modules);
        feed = f;
        noticePane.onFeed(f);
        photoPane.onFeed(f);
        boardPane.onFeed(f);
        if (relayout) requestLayout();
        invalidateAll();
    }

    public Feed feed() { return feed; }
    public void setImageSource(ImageSource s) { images = s; invalidateAll(); }
    public void setNightListener(NightListener l) { nightListener = l; }
    public void setPhotoRemover(PhotoRemover r) { remover = r; }
    public void setPanelSource(PanelSource s) { panelSource = s; }
    public void setExtras(Extras e) { extras = e; }
    public void setWifiControl(WifiControl w) { wifi = w; }
    public void setHeartSender(HeartSender h) { heartSender = h; }
    public void setTodoSender(TodoSender t) { todoSender = t; }
    /** New panel data arrived. */
    public void panelsChanged() { panelPane.invalidate(); }

    void openPanel(OpenPanel p) {
        openPanel = p;
        x.typing = false;
        x.typed.clear();
        x.routeId = -1;
        x.route = null;
        x.wifiPick = null;
        x.wifiTyped.clear();
        x.wifiPage = com.cottageview.kitchen.core.Keyboard.Page.LETTERS;
        if (p.kind == OpenPanel.Kind.WIFI) { x.wifiStatus = null; if (wifi != null) wifi.rescan(); }
        if (p.kind == OpenPanel.Kind.CALENDAR) x.grid = com.cottageview.kitchen.core.CalendarGrid.month(today());
        panelTimer.touched(System.currentTimeMillis());
        menu.tapNo(System.currentTimeMillis());
        if (panelSource != null) panelSource.wantFresh();
        panelPane.setVisibility(VISIBLE);
        panelPane.invalidate();
    }

    /** A remote "show-…" command: open that panel as if tapped (by its Kind name). */
    public void showPanel(String kind) {
        closeDrawer();
        openPanel(new OpenPanel(OpenPanel.Kind.valueOf(kind), null, null));
    }

    public void hidePanel() { if (openPanel != null) closePanel(); }

    void closePanel() {
        openPanel = null;
        panelPane.setVisibility(GONE);
    }

    /** An image finished loading: redraw the panes that might show it. */
    public void imagesChanged() { invalidateAll(); }

    private void invalidateAll() {
        staticPane.invalidate();
        noticePane.invalidate();
        photoPane.invalidate();
        boardPane.invalidate();
        nightPane.invalidate();
        panelPane.invalidate();
        invalidate();
    }

    static boolean hasBoard(Feed f) { return f != null && f.board != null && !f.board.pages.isEmpty(); }

    @Override public boolean onInterceptTouchEvent(MotionEvent e) { return true; }

    private float downX, downY;
    private long downAt;
    private boolean downWasNight;

    @Override public boolean onTouchEvent(MotionEvent e) {
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                downX = e.getX(); downY = e.getY(); downAt = e.getEventTime();
                downWasNight = Boolean.TRUE.equals(wasNight);
                wakeUntil = System.currentTimeMillis() + TAP_WAKE_MS;
                tick();
                break;
            case MotionEvent.ACTION_UP: {
                // a touch that woke the screen only wakes it
                if (downWasNight || boxes == null) break;
                float dx = e.getX() - downX, dy = e.getY() - downY;
                boolean tap = Math.abs(dx) < 30 && Math.abs(dy) < 30 && e.getEventTime() - downAt < 800;
                if (openPanel != null) {
                    panelTimer.touched(System.currentTimeMillis());
                    PanelLayout pl = PanelLayout.compute(getWidth(), getHeight());
                    if (tap && (pl.close.contains(e.getX(), e.getY()) || !pl.card.contains(e.getX(), e.getY()))) closePanel();
                    else if (tap && panelControlTap(pl.body, e.getX(), e.getY())) panelPane.invalidate();
                    else if (tap && openPanel.kind == OpenPanel.Kind.TODAY && feed != null && todoSender != null) {
                        int row = com.cottageview.kitchen.core.TodayPanelLayout.compute(pl.body, feed.todos.size()).rowAt(e.getX(), e.getY());
                        if (row >= 0) {
                            Feed.Todo t = feed.todos.get(row);
                            todoSender.toggle(t.id, t.done);
                        }
                    }
                    break;
                }
                long tNow = System.currentTimeMillis();
                if (!drawer.isOpen(tNow)) {
                    // hidden sidebar: a tap anywhere just brings it out (a swipe still flips the photo)
                    if (tap) { openDrawer(tNow); break; }
                } else {
                    drawer.open(tNow); // any touch keeps it out for another stretch
                    if (tap && boxes.rail.contains(e.getX(), e.getY())) { railTap(e.getX(), e.getY(), tNow); break; }
                }
                if (boxes.photo != null && boxes.photo.contains(downX, downY)) {
                    // on the photo: a sideways swipe flips it, a tap opens its menu
                    int dir = Swipe.classify(dx, dy, e.getEventTime() - downAt);
                    if (dir != 0) { menu.tapNo(System.currentTimeMillis()); photoPane.swipe(dir); }
                    else if (tap) photoTap(e.getX(), e.getY());
                } else if (tap) {
                    kitchenTap(e.getX(), e.getY());
                }
                break;
            }
            default:
                break;
        }
        return true;
    }

    private void openDrawer(long now) {
        drawer.open(now);
        railPane.setVisibility(VISIBLE);
        relayoutAll(); // everything moves along to make room
    }

    private void closeDrawer() {
        drawer.close();
        railPane.setVisibility(GONE);
        relayoutAll();
    }

    private void relayoutAll() {
        requestLayout();
        invalidateAll();
    }

    private void railTap(float x, float y, long now) {
        if (feed != null && boxes.rail.contains(x, y)) {
            java.util.List<Layout.Rail> buttons = Layout.railButtons(feed.modules);
            for (int i = 0; i < buttons.size(); i++) {
                if (Layout.railButton(boxes.rail, i).contains(x, y)) {
                    closeDrawer();
                    openPanel(new OpenPanel(panelFor(buttons.get(i)), null, null));
                    return;
                }
            }
        }
    }

    private boolean wifiTap(Layout.Box body, float tx, float ty) {
        if (x.wifiPick != null) { // typing the password
            com.cottageview.kitchen.core.TypingLayout l = com.cottageview.kitchen.core.TypingLayout.compute(body);
            if (l.cancel.contains(tx, ty)) { x.wifiPick = null; x.wifiTyped.clear(); return true; }
            if (l.add.contains(tx, ty)) {
                if (x.wifiTyped.value().isEmpty()) return true;
                join(x.wifiPick, x.wifiTyped.value());
                x.wifiPick = null;
                x.wifiTyped.clear();
                return true;
            }
            com.cottageview.kitchen.core.Keyboard kb = com.cottageview.kitchen.core.Keyboard.layout(l.keys, x.wifiPage);
            com.cottageview.kitchen.core.Keyboard.Key k = kb.keyAt(tx, ty);
            x.wifiTyped.press(k);
            x.wifiPage = com.cottageview.kitchen.core.Keyboard.Text.pageAfter(k, x.wifiPage);
            return true;
        }
        java.util.List<com.cottageview.kitchen.core.Wifi.Network> nets = wifi.networks();
        com.cottageview.kitchen.core.WifiPanelLayout l = com.cottageview.kitchen.core.WifiPanelLayout.compute(body, nets.size());
        if (l.rescan.contains(tx, ty)) { wifi.rescan(); x.wifiStatus = null; return true; }
        int i = l.rowAt(tx, ty);
        if (i < 0 || x.wifiBusy) return false;
        com.cottageview.kitchen.core.Wifi.Network n = nets.get(i);
        if (n.connected) return true;
        if (n.needsPassword()) { x.wifiPick = n; x.wifiPage = com.cottageview.kitchen.core.Keyboard.Page.LETTERS; }
        else join(n, "");
        return true;
    }

    private void join(final com.cottageview.kitchen.core.Wifi.Network n, String password) {
        x.wifiBusy = true;
        x.wifiStatus = "Connecting to " + n.ssid + "…";
        wifi.connect(n, password, new WifiControl.Done() {
            @Override public void done(boolean ok) {
                x.wifiBusy = false;
                x.wifiStatus = ok ? "Connected to " + n.ssid + " ✓" : "Couldn't join " + n.ssid + " — check the password and try again";
                panelTimer.touched(System.currentTimeMillis());
                panelPane.invalidate();
            }
        });
    }

    /** Today in the household's time zone, YYYY-MM-DD. */
    String today() {
        java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.UK);
        f.setTimeZone(java.util.TimeZone.getTimeZone(feed != null ? feed.nightTimeZone : "Europe/London"));
        return f.format(new java.util.Date());
    }

    /** The calendar's buttons and days, the keyboard, a route row or the map's Back. True if it handled the tap. */
    private boolean panelControlTap(Layout.Box body, float tx, float ty) {
        if (openPanel.kind == OpenPanel.Kind.SETTINGS) {
            if (!com.cottageview.kitchen.core.SharePanelLayout.compute(body).wifi.contains(tx, ty)) return false;
            openPanel(new OpenPanel(OpenPanel.Kind.WIFI, null, null)); // the kitchen's own Wi-Fi screen
            return true;
        }
        if (openPanel.kind == OpenPanel.Kind.WIFI && wifi != null) return wifiTap(body, tx, ty);
        if (openPanel.kind == OpenPanel.Kind.CALENDAR && x.grid != null) {
            com.cottageview.kitchen.core.CalendarPanelLayout l = com.cottageview.kitchen.core.CalendarPanelLayout.compute(body, x.grid.mode);
            com.cottageview.kitchen.core.CalendarGrid g = x.grid;
            if (l.previous.contains(tx, ty)) g = g.previous();
            else if (l.next.contains(tx, ty)) g = g.next();
            else if (l.today.contains(tx, ty)) g = com.cottageview.kitchen.core.CalendarGrid.of(g.mode, today());
            else if (l.month.contains(tx, ty)) g = com.cottageview.kitchen.core.CalendarGrid.month(g.mode == com.cottageview.kitchen.core.CalendarGrid.Mode.WEEK ? g.from : g.focusStart);
            else if (l.week.contains(tx, ty)) g = com.cottageview.kitchen.core.CalendarGrid.week(g.mode == com.cottageview.kitchen.core.CalendarGrid.Mode.MONTH ? (g.inFocus(today()) ? today() : g.focusStart) : g.from);
            else {
                int i = l.dayAt(tx, ty);
                if (i < 0 || g.mode != com.cottageview.kitchen.core.CalendarGrid.Mode.MONTH) return false;
                g = com.cottageview.kitchen.core.CalendarGrid.week(g.dateAt(i)); // a day in the month opens its week
            }
            x.grid = g;
            return true;
        }
        if (openPanel.kind == OpenPanel.Kind.TODAY && x.typing) {
            com.cottageview.kitchen.core.TypingLayout l = com.cottageview.kitchen.core.TypingLayout.compute(body);
            if (l.cancel.contains(tx, ty)) { x.typing = false; x.typed.clear(); return true; }
            if (l.add.contains(tx, ty)) {
                String t = x.typed.value().trim();
                if (t.isEmpty()) return true;
                if (extras != null) extras.addTodo(t);
                x.typing = false;
                x.typed.clear();
                return true;
            }
            x.typed.press(x.keyboard.keyAt(tx, ty));
            return true;
        }
        if (openPanel.kind == OpenPanel.Kind.TODAY && feed != null) {
            com.cottageview.kitchen.core.TodayPanelLayout l = com.cottageview.kitchen.core.TodayPanelLayout.compute(body, feed.todos.size());
            if (!l.addButton.contains(tx, ty)) return false;
            x.typing = true;
            x.typed.clear();
            x.keyboard = com.cottageview.kitchen.core.Keyboard.layout(com.cottageview.kitchen.core.TypingLayout.compute(body).keys);
            return true;
        }
        if (openPanel.kind == OpenPanel.Kind.RIDES) {
            com.cottageview.kitchen.core.Panels p = panelSource == null ? null : panelSource.panels();
            if (x.routeId >= 0) {
                if (!com.cottageview.kitchen.core.RidesPanelLayout.compute(body, 0).back.contains(tx, ty)) return false;
                x.routeId = -1;
                x.route = null;
                return true;
            }
            if (p == null || p.rides == null) return false;
            int i = com.cottageview.kitchen.core.RidesPanelLayout.compute(body, p.rides.routes.size()).routeAt(tx, ty);
            if (i < 0 || p.rides.routes.get(i).id < 0) return false;
            x.routeId = p.rides.routes.get(i).id;
            x.route = null;
            return true;
        }
        return false;
    }

    /** Everything else is tappable too: the weather, each family clock, the flip board. */
    private void kitchenTap(float x, float y) {
        if (feed == null) return;
        if (boxes.hero.contains(x, y)) { openPanel(new OpenPanel(OpenPanel.Kind.WEATHER, null, null)); return; }
        for (int i = 0; boxes.clocks != null && i < Math.min(4, feed.clocks.size()); i++) {
            if (Layout.clockBox(boxes.clocks, i).contains(x, y)) {
                Feed.Clock k = feed.clocks.get(i);
                openPanel(new OpenPanel(OpenPanel.Kind.PLACE, k.key, k.label));
                return;
            }
        }
        if (boxes.board != null && hasBoard(feed) && boxes.board.contains(x, y)) { openPanel(new OpenPanel(OpenPanel.Kind.MESSAGES, null, null)); return; }
        if (boxes.notice != null && boxes.notice.contains(x, y)) {
            // the Today card opens today, tomorrow and the to-do list; the old notice card (older server) flips to the next one
            if (feed.today != null) openPanel(new OpenPanel(OpenPanel.Kind.TODAY, null, null));
            else noticePane.next();
        }
    }

    private void photoTap(float x, float y) {
        long now = System.currentTimeMillis();
        PhotoMenuLayout m = PhotoMenuLayout.compute(boxes.photo);
        switch (menu.state(now)) {
            case CONFIRM:
                if (m.yes.contains(x, y)) {
                    final String id = menu.tapYes(now);
                    if (id != null && remover != null) {
                        remover.remove(id, new PhotoRemover.Done() {
                            @Override public void done(boolean ok) { menu.removed(id, ok, System.currentTimeMillis()); photoPane.invalidate(); }
                        });
                    }
                } else if (m.no.contains(x, y)) {
                    menu.tapNo(now);
                }
                break;
            case DETAILS:
                if (m.remove.contains(x, y)) menu.tapRemove(now);
                else if (m.heart.contains(x, y) && PhotoMenu.canHeart(findPhoto(menu.photoId()), now) && heartSender != null) {
                    final String id = menu.tapHeart(now);
                    if (id != null) {
                        heartSender.send(id, new HeartSender.Done() {
                            @Override public void done(boolean ok, String failure) {
                                heartFailure = failure;
                                menu.hearted(id, ok, System.currentTimeMillis());
                                photoPane.invalidate();
                            }
                        });
                    }
                }
                else menu.tapPhoto(menu.photoId(), now); // tap again closes it
                break;
            case REMOVING:
            case SENDING_HEART:
                break;
            default: {
                Feed.Photo p = photoPane.current();
                if (p != null) menu.tapPhoto(p.id, now);
            }
        }
        photoPane.invalidate();
    }

    @Override protected void onMeasure(int wSpec, int hSpec) {
        int w = MeasureSpec.getSize(wSpec), h = MeasureSpec.getSize(hSpec);
        setMeasuredDimension(w, h);
        for (int i = 0; i < getChildCount(); i++) {
            getChildAt(i).measure(MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY));
        }
    }

    @Override protected void onLayout(boolean changed, int l, int t, int r, int b) {
        int w = r - l, h = b - t;
        boolean board = hasBoard(feed);
        boxes = Layout.compute(w, h, feed != null && feed.warning != null, board,
            board ? feed.board.rows : 2, board ? feed.board.cols : 18, feed != null ? feed.modules : Feed.Modules.ALL,
            drawer.isOpen(System.currentTimeMillis()));
        staticPane.layout(0, 0, w, h);
        nightPane.layout(0, 0, w, h);
        panelPane.layout(0, 0, w, h);
        railPane.layout(0, 0, w, h);
        placeOrHide(noticePane, boxes.notice);
        placeOrHide(photoPane, boxes.photo);
        if (boxes.board != null) { boardPane.setVisibility(VISIBLE); place(boardPane, boxes.board); }
        else boardPane.setVisibility(GONE);
    }

    private static void placeOrHide(View v, Layout.Box b) {
        if (b == null) { v.setVisibility(GONE); return; }
        v.setVisibility(VISIBLE);
        place(v, b);
    }

    private static void place(View v, Layout.Box b) {
        v.measure(MeasureSpec.makeMeasureSpec((int) Math.ceil(b.w()), MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec((int) Math.ceil(b.h()), MeasureSpec.EXACTLY));
        v.layout((int) b.l, (int) b.t, (int) Math.ceil(b.r), (int) Math.ceil(b.b));
    }

    @Override protected void onDraw(Canvas c) {
        if (feed == null) {
            c.drawColor(Palette.PAPER);
            TextPaint p = Draw.text(Fonts.serif, 30, Palette.MUTED);
            String s = "the kitchen is waking up…";
            c.drawText(s, (getWidth() - p.measureText(s)) / 2, getHeight() / 2f, p);
        }
    }

    /** Once a second: night on/off, and the clocks' minute. Animations drive their own panes. */
    private final Runnable ticker = new Runnable() {
        @Override public void run() { tick(); postDelayed(this, 1000); }
    };

    private void tick() {
        if (feed == null) return;
        long now = System.currentTimeMillis();
        boolean night = TimeWindows.inWindow(TimeWindows.hourIn(feed.nightTimeZone, now), feed.nightStartHour, feed.nightEndHour)
            && now > wakeUntil;
        if (openPanel != null && (night || panelTimer.expired(now))) closePanel();
        if (openPanel != null) panelPane.invalidate(); // its clock ticks
        if (railPane.getVisibility() == VISIBLE && (night || !drawer.isOpen(now))) closeDrawer();
        if (wasNight == null || wasNight != night) {
            wasNight = night;
            nightPane.setVisibility(night ? VISIBLE : GONE);
            int day = night ? INVISIBLE : VISIBLE;
            staticPane.setVisibility(day);
            noticePane.setVisibility(day);
            photoPane.setVisibility(day);
            boardPane.setVisibility(night || !hasBoard(feed) ? (night ? INVISIBLE : GONE) : VISIBLE);
            if (nightListener != null) nightListener.onNight(night);
        }
        long minute = now / 60_000L;
        if (minute != lastMinute) {
            lastMinute = minute;
            staticPane.invalidate(); // clocks and the "updated Xh ago" label
            nightPane.invalidate();
        }
    }

    // ---- panes: each draws in screen coordinates, translated to its own origin ----

    private abstract class Pane extends View {
        Pane(Context c) { super(c); }
        @Override protected final void onDraw(Canvas c) {
            if (feed == null || boxes == null) return;
            c.save();
            c.translate(-getLeft(), -getTop());
            paint(c, System.currentTimeMillis());
            c.restore();
        }
        abstract void paint(Canvas c, long now);
    }

    private final class StaticPane extends Pane {
        final WarningRenderer warningR = new WarningRenderer();
        final HeroRenderer heroR = new HeroRenderer();
        final ClocksRenderer clocksR = new ClocksRenderer();
        StaticPane(Context c) {
            super(c);
            // rendered once into a GPU texture and re-rendered only on invalidate (once a minute),
            // instead of replaying hundreds of glyphs + images on every animation frame
            setLayerType(LAYER_TYPE_HARDWARE, null);
        }
        @Override void paint(Canvas c, long now) {
            c.drawColor(Palette.PAPER);
            if (boxes.warning != null) warningR.draw(c, boxes.warning, feed.warning);
            heroR.draw(c, boxes.hero, feed.weather, feed.weather == null ? null : images.scene(feed.weather.sceneUrl), now);

            if (boxes.clocks != null) clocksR.draw(c, boxes.clocks, feed, images, now);
        }
    }

    /** A pane that ticks a Rotator once a second, and every frame while its renderer animates. */
    /** The sidebar, out over the kitchen while the drawer is open. */
    private final class RailPane extends Pane {
        RailPane(Context c) { super(c); }
        @Override void paint(Canvas c, long now) {
            // the kitchen has moved along to make room: the sidebar sits in its own space
            rail(c, boxes.rail, feed);
        }
    }

    private abstract class RotatingPane extends Pane {
        Rotator rot = new Rotator(1000);
        RotatingPane(Context c) { super(c); }
        @Override void paint(Canvas c, long now) {
            if (paintRotating(c, now)) postInvalidateOnAnimation();
            else postInvalidateDelayed(1000);
        }
        abstract boolean paintRotating(Canvas c, long now);
    }

    private final class NoticePane extends RotatingPane {
        final NoticeRenderer r = new NoticeRenderer();
        final TodayRenderer today = new TodayRenderer();
        long interval = -1;
        NoticePane(Context c) { super(c); }
        void onFeed(Feed f) { if (f.noticeRotateMs != interval) { interval = f.noticeRotateMs; rot = new Rotator(interval); } }
        void next() {
            if (feed == null || feed.notices.size() < 2) return;
            rot.step(1, feed.notices.size(), System.currentTimeMillis(), 30_000);
            invalidate();
        }
        @Override boolean paintRotating(Canvas c, long now) {
            if (boxes.notice == null) return false;
            // something on today: the Today card; a quiet day (or an older server): every notice, news too
            if (feed.today != null && !feed.today.items.isEmpty()) {
                String sig = "t:" + (feed.tips.isEmpty() ? "" : feed.tips.get(0).id + "/" + feed.tips.size());
                return today.draw(c, boxes.notice, feed, rot.tick(feed.tips.size(), sig, now));
            }
            String sig = feed.notices.isEmpty() ? "" : feed.notices.get(0).id + "/" + feed.notices.size();
            return r.draw(c, boxes.notice, feed, rot.tick(feed.notices.size(), sig, now));
        }
    }

    private final class PhotoPane extends RotatingPane {
        final PhotoRenderer r = new PhotoRenderer();
        final PhotoMenuRenderer menuR = new PhotoMenuRenderer();
        /** The photo on screen, which is what a tap means (not the slideshow's next one, still loading). */
        Feed.Photo current() { return r.drawn(); }
        long interval = -1;
        PhotoPane(Context c) { super(c); }
        void onFeed(Feed f) { if (f.photoSlideMs != interval) { interval = f.photoSlideMs; rot = new Rotator(interval); } }
        void swipe(int dir) {
            if (feed == null || feed.photos.size() < 2) return;
            rot.step(dir, feed.photos.size(), System.currentTimeMillis(), SWIPE_HOLD_MS);
            invalidate();
        }
        @Override boolean paintRotating(Canvas c, long now) {
            c.drawColor(Palette.PAPER);
            if (boxes.photo == null) return false;
            String sig = feed.photos.isEmpty() ? "" : feed.photos.get(0).id + "/" + feed.photos.size();
            if (menu.open(now)) {
                // keep the menu's photo on screen even if the list changes underneath (a new photo arrives)
                int at = indexOf(menu.photoId());
                if (at >= 0) rot.keep(sig, at);
                else menu.photoGone(now);
                rot.hold(now, 1000);
            }
            Rotator.State s = rot.tick(feed.photos.size(), sig, now);
            // a photo just arrived: it's first in the list, and stays on screen for a couple of minutes
            if (s.fresh && !menu.open(now)) rot.hold(now, NEW_PHOTO_HOLD_MS);
            int index = s.index;
            int n = feed.photos.size();
            if (n > 1) { // warm the neighbours, so a swipe (or the next slide) is ready
                images.photo(feed.photos.get((index + 1) % n).url);
                images.photo(feed.photos.get((index - 1 + n) % n).url);
            }
            r.hideBadge = menu.open(now);
            boolean fading = r.draw(c, boxes.photo, feed, s, images);
            menuR.draw(c, boxes.photo, menu.state(now), findPhoto(menu.photoId()), now, heartFailure);
            return fading;
        }
    }

    static OpenPanel.Kind panelFor(Layout.Rail b) {
        switch (b) {
            case CALENDAR: return OpenPanel.Kind.CALENDAR;
            case TODO: return OpenPanel.Kind.TODAY;
            case RIDES: return OpenPanel.Kind.RIDES;
            case SETTINGS: return OpenPanel.Kind.SETTINGS;
            default: return OpenPanel.Kind.MESSAGES;
        }
    }

    static String labelFor(Layout.Rail b) {
        switch (b) {
            case CALENDAR: return "Calendar";
            case TODO: return "To-do";
            case RIDES: return "Rides";
            case SETTINGS: return "Settings";
            default: return "Messages";
        }
    }

    /** The slim sidebar: an icon and a word per button; To-do shows how many are open. */
    private static void rail(Canvas c, Layout.Box rail, Feed feed) {
        TextPaint label = Draw.text(Fonts.sans, 13, Palette.MUTED);
        java.util.List<Layout.Rail> buttons = Layout.railButtons(feed != null ? feed.modules : Feed.Modules.ALL);
        for (int i = 0; i < buttons.size(); i++) {
            Layout.Rail b = buttons.get(i);
            android.graphics.RectF r = Draw.rect(Layout.railButton(rail, i));
            c.drawRoundRect(r, 16, 16, Draw.fill(Palette.CARD));
            c.drawRoundRect(r, 16, 16, Draw.stroke(Palette.DIVIDER, 1));
            float cx = r.centerX(), cy = r.top + 34, s = 34;
            switch (b) {
                case CALENDAR: Icons.calendar(c, cx, cy, s, Palette.INK); break;
                case TODO: Icons.todo(c, cx, cy, s, Palette.INK); break;
                case RIDES: Icons.bike(c, cx, cy, s, Palette.INK); break;
                case SETTINGS: Icons.gear(c, cx, cy, s, Palette.INK); break;
                default: Icons.messages(c, cx, cy, s, Palette.INK); break;
            }
            String text = labelFor(b);
            c.drawText(text, cx - label.measureText(text) / 2, r.bottom - 14, label);
            int open = b == Layout.Rail.TODO && feed != null ? com.cottageview.kitchen.core.Todos.open(feed.todos) : 0;
            if (open > 0) {
                c.drawCircle(r.right - 14, r.top + 14, 11, Draw.fill(Palette.SAGE));
                TextPaint n = Draw.text(Fonts.sans, 13, 0xFFFFFFFF);
                String sn = String.valueOf(Math.min(open, 99));
                c.drawText(sn, r.right - 14 - n.measureText(sn) / 2, r.top + 19, n);
            }
        }
    }

    private int indexOf(String id) {
        if (feed == null || id == null) return -1;
        for (int i = 0; i < feed.photos.size(); i++) if (feed.photos.get(i).id.equals(id)) return i;
        return -1;
    }

    private Feed.Photo findPhoto(String id) {
        if (feed == null || id == null) return null;
        for (Feed.Photo p : feed.photos) if (p.id.equals(id)) return p;
        return null;
    }

    private final class BoardPane extends RotatingPane {
        final BoardRenderer r = new BoardRenderer();
        long interval = -1;
        BoardPane(Context c) { super(c); }
        void onFeed(Feed f) {
            if (f.board != null && f.board.rotateMs != interval) { interval = f.board.rotateMs; rot = new Rotator(interval); }
        }
        @Override boolean paintRotating(Canvas c, long now) {
            if (!hasBoard(feed) || boxes.board == null) return false;
            Feed.BoardPage p = feed.board.pages.get(0);
            String sig = p.from + ":" + p.lines + "/" + feed.board.pages.size();
            return r.draw(c, boxes.board, boxes.tile, feed.board, rot.tick(feed.board.pages.size(), sig, now));
        }
    }

    private final class PanelPane extends Pane {
        final PanelRenderer r = new PanelRenderer();
        final PanelRenderer.Icons icons = new PanelRenderer.Icons() {
            @Override public Bitmap icon(String url) { return images.icon(url); }
            @Override public Bitmap scene(String url) { return images.scene(url); }
        };
        PanelPane(Context c) { super(c); }
        @Override void paint(Canvas c, long now) {
            if (openPanel == null) return;
            // what the interactive parts show: fetched on demand, redrawn when it arrives
            if (extras != null && openPanel.kind == OpenPanel.Kind.CALENDAR && x.grid != null) x.gridDays = extras.calendar(x.grid.from, x.grid.days);
            if (extras != null && x.routeId >= 0 && x.route == null) x.route = extras.route(x.routeId);
            x.today = today();
            x.tiles = new ExtrasRenderer.Tiles() { @Override public Bitmap tile(String url) { return images.tile(url); } };
            x.wifiNetworks = wifi != null && openPanel.kind == OpenPanel.Kind.WIFI ? wifi.networks() : null;
            r.draw(c, getWidth(), getHeight(), openPanel, panelSource == null ? null : panelSource.panels(), feed, icons, now, x);
            if (openPanel.kind == OpenPanel.Kind.WIFI) postInvalidateDelayed(1000); // the list refreshes as scans land
            if (x.typing) postInvalidateDelayed(500); // the caret blinks
        }
    }

    private final class NightPane extends Pane {
        final NightRenderer r = new NightRenderer();
        NightPane(Context c) { super(c); }
        @Override void paint(Canvas c, long now) { r.draw(c, getWidth(), getHeight(), feed.nightTimeZone, now); }
    }
}
