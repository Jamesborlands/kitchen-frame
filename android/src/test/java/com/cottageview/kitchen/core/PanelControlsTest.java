package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class PanelControlsTest {
    static final Layout.Box BODY = PanelLayout.compute(1366, 768).body;

    static void bigAndInside(Layout.Box b, Layout.Box area, String name) {
        assertTrue(name + " inside", b.inside(area));
        assertTrue(name + " finger-sized", b.h() >= 56 && b.w() >= 56);
    }

    @Test public void theToDoListHasAnAddButtonUnderTheRows() {
        TodayPanelLayout l = TodayPanelLayout.compute(BODY, 20);
        bigAndInside(l.addButton, l.todoColumn, "add");
        for (Layout.Box r : l.todoRows) assertFalse(r.overlaps(l.addButton));
        assertTrue(l.todoRows.length >= 4);
    }

    @Test public void typingATodo() {
        TypingLayout t = TypingLayout.compute(BODY);
        bigAndInside(t.field, BODY, "field");
        bigAndInside(t.add, BODY, "add");
        bigAndInside(t.cancel, BODY, "cancel");
        assertTrue(t.keys.inside(BODY));
        assertFalse(t.field.overlaps(t.add) || t.field.overlaps(t.cancel) || t.add.overlaps(t.cancel));
        assertTrue(t.keys.t > t.field.b);
        assertTrue("room for big keys", t.keys.h() >= 4 * 64 + 30);
    }

    @Test public void theCalendarsControlsAndDays() {
        CalendarPanelLayout l = CalendarPanelLayout.compute(BODY, CalendarGrid.Mode.MONTH);
        Layout.Box[] buttons = { l.previous, l.next, l.today, l.month, l.week };
        for (int i = 0; i < buttons.length; i++) {
            bigAndInside(buttons[i], BODY, "button " + i);
            for (int k = i + 1; k < buttons.length; k++) assertFalse(buttons[i].overlaps(buttons[k]));
            assertTrue(buttons[i].b <= l.grid.t);
        }
        assertEquals(42, l.cells.length);
        for (Layout.Box c : l.cells) assertTrue(c.inside(l.grid));
        assertEquals(17, l.dayAt((l.cells[17].l + l.cells[17].r) / 2, (l.cells[17].t + l.cells[17].b) / 2));
        assertEquals(-1, l.dayAt(l.previous.l + 2, l.previous.t + 2));
        CalendarPanelLayout w = CalendarPanelLayout.compute(BODY, CalendarGrid.Mode.WEEK);
        assertEquals(7, w.cells.length);
        assertTrue("a week's day is a tall column", w.cells[0].h() > 300);
    }

    @Test public void routesAreTappableAndTheMapFillsThePanel() {
        RidesPanelLayout l = RidesPanelLayout.compute(BODY, 10);
        assertTrue(l.routeRows.length >= 5);
        for (int i = 0; i < l.routeRows.length; i++) {
            assertTrue(l.routeRows[i].inside(BODY));
            assertTrue(l.routeRows[i].h() >= 44);
            if (i > 0) assertFalse(l.routeRows[i].overlaps(l.routeRows[i - 1]));
        }
        assertEquals(2, l.routeAt((l.routeRows[2].l + l.routeRows[2].r) / 2, (l.routeRows[2].t + l.routeRows[2].b) / 2));
        bigAndInside(l.back, BODY, "back");
        assertTrue(l.map.inside(BODY));
        assertTrue(l.map.w() >= 900 && l.map.h() >= 400);
        assertFalse(l.map.overlaps(l.back));
    }
}
