package com.cottageview.kitchen.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import com.cottageview.kitchen.core.BoxBlur;
import com.cottageview.kitchen.core.Orientation;
import com.cottageview.kitchen.core.SampleSize;
import java.io.IOException;
import java.io.File;

/** Decoding sized to the screen (1 GB RAM), and a cheap blur for the photo backdrop. */
public final class Images {
    private Images() {}

    public static Bitmap decode(File f, int maxW, int maxH) {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(f.getPath(), o);
        if (o.outWidth <= 0) return null;
        o.inJustDecodeBounds = false;
        o.inSampleSize = SampleSize.compute(o.outWidth, o.outHeight, maxW, maxH);
        o.inPreferredConfig = Bitmap.Config.ARGB_8888;
        Bitmap b;
        try { b = BitmapFactory.decodeFile(f.getPath(), o); } catch (OutOfMemoryError e) { return null; }
        return upright(b, f);
    }

    /** Apply the photo's EXIF orientation — Android 4.4's decoder ignores it, so portrait shots came out sideways. */
    static Bitmap upright(Bitmap b, File f) {
        if (b == null) return null;
        int deg;
        try {
            deg = Orientation.degrees(new ExifInterface(f.getPath()).getAttributeInt(ExifInterface.TAG_ORIENTATION, 1));
        } catch (IOException e) {
            return b; // not a JPEG with EXIF (e.g. the webp watercolours)
        }
        if (deg == 0) return b;
        Matrix m = new Matrix();
        m.postRotate(deg);
        try {
            Bitmap r = Bitmap.createBitmap(b, 0, 0, b.getWidth(), b.getHeight(), m, true);
            if (r != b) b.recycle();
            return r;
        } catch (OutOfMemoryError e) {
            return b;
        }
    }

    /** A soft backdrop: shrink to ~96px across, blur properly (BoxBlur), and let the GPU scale it back up smoothly. */
    public static Bitmap blur(Bitmap src) {
        if (src == null) return null;
        float k = 96f / Math.max(src.getWidth(), src.getHeight());
        int w = Math.max(1, Math.round(src.getWidth() * k)), h = Math.max(1, Math.round(src.getHeight() * k));
        Bitmap small = Bitmap.createScaledBitmap(src, w, h, true);
        int[] px = new int[w * h];
        small.getPixels(px, 0, w, 0, 0, w, h);
        BoxBlur.blur(px, w, h, 4, 3);
        Bitmap out = small.isMutable() ? small : small.copy(Bitmap.Config.ARGB_8888, true);
        if (out != small) small.recycle();
        out.setPixels(px, 0, w, 0, 0, w, h);
        return out;
    }
}
