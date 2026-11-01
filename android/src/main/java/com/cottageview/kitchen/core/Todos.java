package com.cottageview.kitchen.core;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * A to-do ticked on the frame shows as ticked at once, before the server has
 * it; once a fresh feed agrees, the local tap is forgotten. UI thread only.
 */
public final class Todos {
    private final Map<String, Boolean> local = new HashMap<>();

    /** Tapped an item that was `wasDone`: it's now the opposite. */
    public void tapped(String id, boolean wasDone) { local.put(id, !wasDone); }

    /** The list as this frame believes it. */
    public List<Feed.Todo> apply(List<Feed.Todo> server) {
        List<Feed.Todo> out = new ArrayList<>(server.size());
        for (Feed.Todo t : server) {
            Boolean mine = local.get(t.id);
            out.add(mine == null || mine == t.done ? t : new Feed.Todo(t.id, t.text, mine));
        }
        return out;
    }

    /** A fresh feed arrived: forget local taps it already reflects (or whose item is gone). */
    public void settle(List<Feed.Todo> server) {
        Map<String, Boolean> seen = new HashMap<>();
        for (Feed.Todo t : server) seen.put(t.id, t.done);
        for (String id : new ArrayList<>(local.keySet())) {
            Boolean s = seen.get(id);
            if (s == null || s.equals(local.get(id))) local.remove(id);
        }
    }

    public static int open(List<Feed.Todo> l) {
        int n = 0;
        for (Feed.Todo t : l) if (!t.done) n++;
        return n;
    }
}
