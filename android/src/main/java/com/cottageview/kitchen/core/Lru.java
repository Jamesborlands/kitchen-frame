package com.cottageview.kitchen.core;

import java.util.LinkedHashMap;
import java.util.Map;

/** A map that forgets its least recently used entry beyond `max` (decoded photos: ~2 MB each). */
public final class Lru<K, V> extends LinkedHashMap<K, V> {
    private final int max;
    public Lru(int max) { super(16, 0.75f, true); this.max = max; }
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) { return size() > max; }
}
