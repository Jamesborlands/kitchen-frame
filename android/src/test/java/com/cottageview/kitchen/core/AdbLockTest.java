package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class AdbLockTest {
    @Test public void closesTheLanButNeverTheFramesOwnLoopback() {
        assertTrue(AdbLock.CLOSE.contains("--dport 5555"));
        assertTrue(AdbLock.CLOSE.contains("! -i lo")); // the app's root actions come in on lo
        assertTrue(AdbLock.CLOSE.contains("-j DROP"));
    }

    @Test public void closingTwiceAddsOneRule() {
        // check first, insert only if missing
        assertTrue(AdbLock.CLOSE.startsWith("iptables -C "));
        assertTrue(AdbLock.CLOSE.contains(" || iptables -I "));
    }

    @Test public void openingRemovesEveryCopy() {
        assertTrue(AdbLock.OPEN.startsWith("while iptables -D "));
    }

    @Test public void staysOpenForHalfAnHour() {
        assertEquals(30 * 60_000L, AdbLock.OPEN_MS);
    }
}
