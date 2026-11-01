package com.cottageview.kitchen.core;

/**
 * EXIF orientation → clockwise rotation. Phones often save a portrait shot as a
 * sideways image plus this tag; browsers obey it, Android 4.4's decoder doesn't.
 * (Mirrored values 2/4/5/7 are rare from phone cameras and are drawn unrotated.)
 */
public final class Orientation {
    private Orientation() {}

    public static int degrees(int exifOrientation) {
        switch (exifOrientation) {
            case 3: return 180;
            case 6: return 90;
            case 8: return 270;
            default: return 0;
        }
    }
}
