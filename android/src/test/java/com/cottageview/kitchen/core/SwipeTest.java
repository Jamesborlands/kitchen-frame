package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class SwipeTest {
    @Test public void swipeLeftIsNext() { assertEquals(1, Swipe.classify(-150, 10, 200)); }
    @Test public void swipeRightIsPrevious() { assertEquals(-1, Swipe.classify(150, -20, 200)); }
    @Test public void aTapIsNotASwipe() { assertEquals(0, Swipe.classify(8, 4, 120)); }
    @Test public void mostlyVerticalIsNotASwipe() { assertEquals(0, Swipe.classify(90, 140, 200)); }
    @Test public void aSlowDragStillCounts() { assertEquals(1, Swipe.classify(-200, 0, 1500)); }
    @Test public void aLongPressThatWandersIsNot() { assertEquals(0, Swipe.classify(-200, 0, 4000)); }
}
