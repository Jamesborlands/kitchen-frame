package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;

public class UpdatePolicyTest {
    static final long MIN = 60_000L;
    static PendingUpdate pending(long at) { return new PendingUpdate(3, 4, at); }

    @Test public void downloadsOnlyNewer() {
        assertTrue(UpdatePolicy.shouldDownload(3, 4));
        assertFalse(UpdatePolicy.shouldDownload(4, 4));
        assertFalse(UpdatePolicy.shouldDownload(4, 3));
        assertFalse(UpdatePolicy.shouldDownload(4, -1));
    }

    @Test public void verifiesSizeAndHash() throws Exception {
        File f = Files.createTempFile("apk", ".apk").toFile();
        try (FileOutputStream o = new FileOutputStream(f)) { o.write(new byte[]{1, 2, 3}); }
        String good = Hashes.sha256Hex(new byte[]{1, 2, 3});
        assertTrue(UpdatePolicy.verify(f, good, 3));
        assertFalse(UpdatePolicy.verify(f, good, 4));              // truncated / wrong size
        String tampered = (good.charAt(0) == '0' ? "1" : "0") + good.substring(1);
        assertFalse(UpdatePolicy.verify(f, tampered, 3)); // tampered
        assertFalse(UpdatePolicy.verify(new File(f.getPath() + ".missing"), good, 3));
    }

    @Test public void nothingPendingNothingToDo() {
        assertEquals(UpdatePolicy.Decision.NONE, UpdatePolicy.decideOnStart(4, null, Collections.<Long>emptyList(), 0));
    }

    @Test public void watchesANewVersionForTenMinutes() {
        assertEquals(UpdatePolicy.Decision.KEEP_WATCHING, UpdatePolicy.decideOnStart(4, pending(0), Collections.<Long>emptyList(), 5 * MIN));
        assertEquals(UpdatePolicy.Decision.CLEAR, UpdatePolicy.decideOnStart(4, pending(0), Collections.<Long>emptyList(), 11 * MIN));
    }

    @Test public void rollsBackAfterThreeCrashesInTheWindow() {
        assertEquals(UpdatePolicy.Decision.ROLLBACK,
            UpdatePolicy.decideOnStart(4, pending(0), Arrays.asList(1 * MIN, 2 * MIN, 3 * MIN), 4 * MIN));
    }

    @Test public void oldCrashesDoNotCount() {
        // two crashes before the install + two after → only two count
        assertEquals(UpdatePolicy.Decision.KEEP_WATCHING,
            UpdatePolicy.decideOnStart(4, pending(10 * MIN), Arrays.asList(1 * MIN, 2 * MIN, 11 * MIN, 12 * MIN), 13 * MIN));
    }

    @Test public void clearsWhenTheInstallDidNotTakeOrAlreadyRolledBack() {
        // running version isn't the one we installed → nothing to watch (prevents a rollback loop)
        assertEquals(UpdatePolicy.Decision.CLEAR,
            UpdatePolicy.decideOnStart(3, pending(0), Arrays.asList(1 * MIN, 2 * MIN, 3 * MIN), 4 * MIN));
    }

    @Test public void pendingUpdateRoundTrips() throws Exception {
        File f = Files.createTempFile("pending", ".json").toFile();
        pending(42).save(f);
        PendingUpdate p = PendingUpdate.load(f);
        assertEquals(3, p.fromVersion);
        assertEquals(4, p.toVersion);
        assertEquals(42, p.installedAt);
        PendingUpdate.clear(f);
        assertNull(PendingUpdate.load(f));
        assertNull(PendingUpdate.parse("garbage"));
    }

    @Test public void triesANewVersionStraightAway() {
        // a release check that found nothing newer must not hold up the next real update
        assertTrue(UpdatePolicy.shouldAttempt(2, 3, -1, 0, 1000));
        assertTrue(UpdatePolicy.shouldAttempt(2, 4, 3, 1000, 1001)); // even right after failing 3
    }

    @Test public void retriesTheSameVersionOnlyEveryHalfHour() {
        assertFalse(UpdatePolicy.shouldAttempt(2, 3, 3, 0, 29 * MIN));
        assertTrue(UpdatePolicy.shouldAttempt(2, 3, 3, 0, 31 * MIN));
    }

    @Test public void nothingNewerNothingToTry() {
        assertFalse(UpdatePolicy.shouldAttempt(3, 3, -1, 0, 0));
        assertFalse(UpdatePolicy.shouldAttempt(3, -1, -1, 0, 0));
    }

    @Test public void neverRetriesAVersionThatWasRolledBack() {
        // v3 crashed and was rolled back: don't install it again (that would loop)…
        assertFalse(UpdatePolicy.shouldAttempt(2, 3, -1, 0, 99 * MIN, 3));
        // …but a newer fixed release is fine
        assertTrue(UpdatePolicy.shouldAttempt(2, 4, -1, 0, 99 * MIN, 3));
    }

    // A rollback that didn't finish leaves us running the bad version: keep trying, but not on every crash-restart.
    @Test public void retriesAnUnfinishedRollbackEveryTwoMinutes() {
        assertTrue(UpdatePolicy.shouldRetryRollback(3, 3, 0, 10 * MIN));
        assertFalse(UpdatePolicy.shouldRetryRollback(3, 3, 9 * MIN, 10 * MIN));
        assertTrue(UpdatePolicy.shouldRetryRollback(3, 3, 8 * MIN, 10 * MIN));
    }

    @Test public void noRollbackRetryOnAGoodVersion() {
        assertFalse(UpdatePolicy.shouldRetryRollback(2, 3, 0, 10 * MIN));
        assertFalse(UpdatePolicy.shouldRetryRollback(2, -1, 0, 10 * MIN));
    }
}
