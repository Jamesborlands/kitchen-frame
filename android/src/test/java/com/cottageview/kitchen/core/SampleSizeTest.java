package com.cottageview.kitchen.core;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

public class SampleSizeTest {
    @Test public void phonePhotoIntoThePhotoPane() { assertEquals(4, SampleSize.compute(4032, 3024, 738, 560)); } // 1008x756 still covers 738x560
    @Test public void smallImageIsNotScaled() { assertEquals(1, SampleSize.compute(800, 600, 1366, 768)); }
    @Test public void exactHalf() { assertEquals(2, SampleSize.compute(2000, 1000, 1000, 500)); }
    @Test public void zeroTargetIsSafe() { assertEquals(1, SampleSize.compute(100, 100, 0, 0)); }
}
