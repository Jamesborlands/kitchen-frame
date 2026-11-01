package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

public class TodosTest {
    @Test public void aTapShowsAtOnceUntilTheServerAgrees() {
        List<Feed.Todo> server = new ArrayList<>();
        server.add(new Feed.Todo("t1", "Stamps", false));
        Todos t = new Todos();
        t.tapped("t1", false);                       // was open → now done, locally
        assertTrue(t.apply(server).get(0).done);
        List<Feed.Todo> agreed = new ArrayList<>();
        agreed.add(new Feed.Todo("t1", "Stamps", true));
        assertTrue(t.apply(agreed).get(0).done);
        t.settle(agreed);                            // the server caught up: forget the local tap
        assertFalse(t.apply(server).get(0).done);
    }

    @Test public void openCount() {
        List<Feed.Todo> l = new ArrayList<>();
        l.add(new Feed.Todo("a", "a", false));
        l.add(new Feed.Todo("b", "b", true));
        assertEquals(1, Todos.open(l));
    }
}
