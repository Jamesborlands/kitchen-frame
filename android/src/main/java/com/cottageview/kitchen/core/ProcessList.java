package com.cottageview.kitchen.core;

/** Reads toolbox `ps` output (Android 4.4 has no pidof): is a process with this basename running? */
public final class ProcessList {
    private ProcessList() {}

    public static boolean has(String psOutput, String name) {
        for (String line : psOutput.split("\n")) {
            String t = line.trim();
            if (t.isEmpty()) continue;
            String last = t.substring(t.lastIndexOf(' ') + 1);
            String base = last.substring(last.lastIndexOf('/') + 1);
            if (base.equals(name)) return true;
        }
        return false;
    }
}
