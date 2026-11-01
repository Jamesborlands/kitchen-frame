package com.cottageview.kitchen.core;

import java.util.Locale;

/**
 * How a family photo fills the photo panel.
 *   WHOLE — the whole photo over a blurred enlargement of itself (the web's style)
 *   FILL  — crop to fill the panel edge to edge
 *   SMART — crop landscape photos to fill, but keep portrait (and very wide) photos whole
 */
public final class PhotoFit {
    private PhotoFit() {}

    public enum Mode {
        WHOLE, FILL, SMART;

        public static Mode parse(String s) {
            if (s == null) return SMART;
            try { return valueOf(s.trim().toUpperCase(Locale.UK)); } catch (IllegalArgumentException e) { return SMART; }
        }
    }

    public enum Draw { CONTAIN, COVER }

    /** Wider than this (vs the panel) and SMART keeps a landscape photo whole rather than crop most of it. */
    static final float MAX_SMART_CROP = 1.5f;

    public static Draw decide(Mode mode, int imgW, int imgH, float boxW, float boxH) {
        if (mode == Mode.WHOLE) return Draw.CONTAIN;
        if (mode == Mode.FILL) return Draw.COVER;
        if (imgW <= imgH) return Draw.CONTAIN; // portrait: never crop heads off
        float ratio = (imgW / (float) imgH) / (boxW / boxH);
        return ratio <= MAX_SMART_CROP ? Draw.COVER : Draw.CONTAIN;
    }
}
