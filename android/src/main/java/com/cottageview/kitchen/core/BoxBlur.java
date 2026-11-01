package com.cottageview.kitchen.core;

/**
 * A real blur for the photo backdrop: repeated horizontal + vertical box blurs
 * (three passes ≈ a Gaussian) over opaque ARGB pixels, edges clamped. Run on a
 * small copy of the photo (~100px across), so it costs a few ms once per photo —
 * the old shrink-and-stretch "blur" looked blocky when scaled back up.
 */
public final class BoxBlur {
    private BoxBlur() {}

    public static void blur(int[] px, int w, int h, int radius, int passes) {
        if (radius < 1 || w < 1 || h < 1) return;
        int[] tmp = new int[px.length];
        for (int p = 0; p < passes; p++) {
            rows(px, tmp, w, h, radius);
            cols(tmp, px, w, h, radius);
        }
    }

    private static void rows(int[] src, int[] dst, int w, int h, int r) {
        int n = 2 * r + 1;
        for (int y = 0; y < h; y++) {
            int base = y * w, rs = 0, gs = 0, bs = 0;
            for (int i = -r; i <= r; i++) {
                int c = src[base + clamp(i, w)];
                rs += (c >> 16) & 0xff; gs += (c >> 8) & 0xff; bs += c & 0xff;
            }
            for (int x = 0; x < w; x++) {
                dst[base + x] = 0xFF000000 | ((rs / n) << 16) | ((gs / n) << 8) | (bs / n);
                int out = src[base + clamp(x - r, w)], in = src[base + clamp(x + r + 1, w)];
                rs += ((in >> 16) & 0xff) - ((out >> 16) & 0xff);
                gs += ((in >> 8) & 0xff) - ((out >> 8) & 0xff);
                bs += (in & 0xff) - (out & 0xff);
            }
        }
    }

    private static void cols(int[] src, int[] dst, int w, int h, int r) {
        int n = 2 * r + 1;
        for (int x = 0; x < w; x++) {
            int rs = 0, gs = 0, bs = 0;
            for (int i = -r; i <= r; i++) {
                int c = src[clamp(i, h) * w + x];
                rs += (c >> 16) & 0xff; gs += (c >> 8) & 0xff; bs += c & 0xff;
            }
            for (int y = 0; y < h; y++) {
                dst[y * w + x] = 0xFF000000 | ((rs / n) << 16) | ((gs / n) << 8) | (bs / n);
                int out = src[clamp(y - r, h) * w + x], in = src[clamp(y + r + 1, h) * w + x];
                rs += ((in >> 16) & 0xff) - ((out >> 16) & 0xff);
                gs += ((in >> 8) & 0xff) - ((out >> 8) & 0xff);
                bs += (in & 0xff) - (out & 0xff);
            }
        }
    }

    private static int clamp(int i, int len) { return i < 0 ? 0 : (i >= len ? len - 1 : i); }
}
