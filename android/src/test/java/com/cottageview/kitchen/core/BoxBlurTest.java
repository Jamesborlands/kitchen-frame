package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class BoxBlurTest {
    static int red(int argb) { return (argb >> 16) & 0xff; }

    @Test public void aFlatImageStaysFlat() {
        int[] px = new int[20 * 10];
        java.util.Arrays.fill(px, 0xFF336699);
        BoxBlur.blur(px, 20, 10, 3, 3);
        for (int p : px) assertEquals(0xFF336699, p);
    }

    @Test public void aBrightDotSpreadsOutSmoothly() {
        int w = 21, h = 21;
        int[] px = new int[w * h];
        java.util.Arrays.fill(px, 0xFF000000);
        px[10 * w + 10] = 0xFFFFFFFF;
        BoxBlur.blur(px, w, h, 2, 3);
        int centre = red(px[10 * w + 10]), near = red(px[10 * w + 12]), far = red(px[10 * w + 20]);
        assertTrue("centre dimmed", centre < 255);
        assertTrue("light reached the neighbours", near > 0);
        assertTrue("falls off with distance", centre > near && near >= far);
        assertEquals(0xFF, (px[10 * w + 10] >>> 24)); // stays opaque
    }

    @Test public void edgesDoNotDarken() {
        int[] px = new int[8 * 8];
        java.util.Arrays.fill(px, 0xFFFFFFFF);
        BoxBlur.blur(px, 8, 8, 3, 2);
        assertEquals(0xFFFFFFFF, px[0]);
        assertEquals(0xFFFFFFFF, px[63]);
    }
}
