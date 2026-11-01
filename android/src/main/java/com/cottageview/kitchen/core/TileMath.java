package com.cottageview.kitchen.core;

import java.util.ArrayList;
import java.util.List;

/** Web Mercator (OpenStreetMap's 256 px tiles): which tiles cover a route, and where things go on screen. */
public final class TileMath {
    public static final int TILE = 256;
    private TileMath() {}

    public static double lonToTileX(double lon, int z) { return (lon + 180) / 360 * (1 << z); }

    public static double latToTileY(double lat, int z) {
        double r = Math.toRadians(lat);
        return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * (1 << z);
    }

    /** A map of width×height pixels at `zoom`, with (originX, originY) its top-left in world pixels. */
    public static final class View {
        public final int zoom, width, height;
        public final double originX, originY;
        View(int zoom, int width, int height, double originX, double originY) {
            this.zoom = zoom; this.width = width; this.height = height; this.originX = originX; this.originY = originY;
        }

        public float[] toScreen(double lat, double lon) {
            return new float[] { (float) (lonToTileX(lon, zoom) * TILE - originX), (float) (latToTileY(lat, zoom) * TILE - originY) };
        }

        /** Where tile (x, y) at this zoom has its top-left corner on screen. */
        public float[] tileOrigin(int x, int y) { return new float[] { (float) (x * TILE - originX), (float) (y * TILE - originY) }; }

        /** Every tile {z, x, y} that shows in the view. */
        public List<int[]> tiles() {
            List<int[]> out = new ArrayList<>();
            int x0 = (int) Math.floor(originX / TILE), y0 = (int) Math.floor(originY / TILE);
            int x1 = (int) Math.floor((originX + width - 1) / TILE), y1 = (int) Math.floor((originY + height - 1) / TILE);
            for (int y = y0; y <= y1; y++) for (int x = x0; x <= x1; x++) out.add(new int[] { zoom, x, y });
            return out;
        }
    }

    /** The closest zoom (≤ 16) that fits the box with a margin, centred. */
    public static View fit(double south, double west, double north, double east, int width, int height) {
        int z = 16;
        for (; z > 3; z--) {
            double w = (lonToTileX(east, z) - lonToTileX(west, z)) * TILE, h = (latToTileY(south, z) - latToTileY(north, z)) * TILE;
            if (w <= width * 0.85 && h <= height * 0.85) break;
        }
        double cx = (lonToTileX(west, z) + lonToTileX(east, z)) / 2 * TILE, cy = (latToTileY(north, z) + latToTileY(south, z)) / 2 * TILE;
        return new View(z, width, height, cx - width / 2.0, cy - height / 2.0);
    }
}
