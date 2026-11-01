package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class DetachedTest {
    @Test public void writesTheScriptVerbatimWithAQuotedHeredoc() {
        String cmd = Detached.writeScript("/data/local/tmp/k.sh", "cp '/a b' /x && pm install -r /x\necho $?");
        assertTrue(cmd.startsWith("cat > /data/local/tmp/k.sh <<'KITCHEN_EOF'\n"));
        assertTrue(cmd.contains("cp '/a b' /x && pm install -r /x\necho $?\nKITCHEN_EOF\n")); // no escaping needed: quoted delimiter
    }

    @Test(expected = IllegalArgumentException.class)
    public void refusesABodyContainingTheDelimiter() {
        Detached.writeScript("/x.sh", "echo hi\nKITCHEN_EOF\nrm -rf /");
    }

    @Test public void launchesInItsOwnSessionWithAFallback() {
        String cmd = Detached.launch("/data/local/tmp/k.sh", "/data/local/tmp/k.log");
        assertTrue(cmd.contains("busybox setsid sh /data/local/tmp/k.sh"));  // a new session: nothing aimed at adb's shell reaches it
        assertTrue(cmd.contains("trap '' HUP"));                              // fallback without busybox
        assertTrue(cmd.contains("</dev/null > /data/local/tmp/k.log 2>&1 &"));
    }
}
