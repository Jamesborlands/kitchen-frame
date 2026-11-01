package com.cottageview.kitchen.core;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

public class OrientationTest {
    // EXIF orientation tag values (phones store portrait shots sideways + this tag)
    @Test public void upright() { assertEquals(0, Orientation.degrees(1)); }
    @Test public void upsideDown() { assertEquals(180, Orientation.degrees(3)); }
    @Test public void portraitTakenNormally() { assertEquals(90, Orientation.degrees(6)); }
    @Test public void portraitTakenTheOtherWay() { assertEquals(270, Orientation.degrees(8)); }
    @Test public void missingOrUnknownIsUpright() {
        assertEquals(0, Orientation.degrees(0));
        assertEquals(0, Orientation.degrees(99));
    }
}
