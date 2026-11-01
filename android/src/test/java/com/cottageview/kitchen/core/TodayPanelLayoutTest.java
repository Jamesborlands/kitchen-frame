package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class TodayPanelLayoutTest {
    final Layout.Box body = new Layout.Box(56, 140, 1310, 712);

    @Test public void todoRowsAreBigAndStackInTheRightColumn() {
        TodayPanelLayout l = TodayPanelLayout.compute(body, 4);
        assertEquals(4, l.todoRows.length);
        for (Layout.Box r : l.todoRows) {
            assertTrue(r.inside(body));
            assertTrue(r.h() >= 64);
            assertTrue(r.l >= l.todayColumn.r);
        }
        assertTrue(l.todoRows[1].t > l.todoRows[0].b);
        assertEquals(-1, l.rowAt(10, 10));
        assertEquals(2, l.rowAt(l.todoRows[2].l + 5, l.todoRows[2].t + 5));
    }

    @Test public void onlyAsManyRowsAsFit() {
        TodayPanelLayout l = TodayPanelLayout.compute(body, 40);
        assertTrue(l.todoRows.length < 40);
        assertTrue(l.todoRows[l.todoRows.length - 1].b <= body.b);
    }
}
