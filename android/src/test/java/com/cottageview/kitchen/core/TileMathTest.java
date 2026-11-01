package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class TileMathTest {
    @Test public void picksTheClosestZoomThatFitsTheRoute() {
        // Whitcliffe loop-ish: ~3 km across, in a 1000x560 box
        TileMath.View v = TileMath.fit(52.355, -2.735, 52.383, -2.718, 1000, 560);
        assertTrue(v.zoom >= 13 && v.zoom <= 15);
        float[] sw = v.toScreen(52.355, -2.735), ne = v.toScreen(52.383, -2.718);
        for (float[] p : new float[][] {sw, ne}) {
            assertTrue(p[0] >= 0 && p[0] <= 1000);
            assertTrue(p[1] >= 0 && p[1] <= 560);
        }
        assertTrue("north is up", ne[1] < sw[1]);
        assertTrue("east is right", ne[0] > sw[0]);
    }

    @Test public void listsTheTilesThatCoverTheBox() {
        TileMath.View v = TileMath.fit(52.355, -2.735, 52.383, -2.718, 1000, 560);
        java.util.List<int[]> tiles = v.tiles();
        assertTrue(tiles.size() >= 4 && tiles.size() <= 30);
        for (int[] t : tiles) assertEquals(v.zoom, t[0]);
        // every tile drawn where it belongs: its top-left corner on screen spacing of 256
        int[] first = tiles.get(0);
        float[] at = v.tileOrigin(first[1], first[2]);
        assertTrue(at[0] <= 0 && at[1] <= 0);
    }

    @Test public void aKnownTile() {
        // Ludlow at zoom 13 is tile x=4034, y=2692 (OSM slippy map)
        assertEquals(4034, (int) Math.floor(TileMath.lonToTileX(-2.7186, 13)));
        assertEquals(2692, (int) Math.floor(TileMath.latToTileY(52.3675, 13)));
    }
}
