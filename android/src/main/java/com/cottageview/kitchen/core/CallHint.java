package com.cottageview.kitchen.core;

/** Is it a good time to ring them? Same rules and words as the web (lib/time/clocks.ts). */
public final class CallHint {
    private CallHint() {}

    public static String forHour(int hour24) {
        if (hour24 >= 9 && hour24 < 21) return "good time to call";
        if ((hour24 >= 7 && hour24 < 9) || (hour24 >= 21 && hour24 < 23)) return "maybe early or late";
        return "probably asleep";
    }
}
