package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class ProcessListTest {
    static final String PS = "USER     PID   PPID  VSIZE  RSS     WCHAN    PC         NAME\n"
        + "root      1     0     1004   184   c00a3d28 0001c7f8 S /init\n"
        + "root      1234  1     10000  9000  ffffffff 00000000 S /data/tailscale/tailscaled\n";
    @Test public void findsByBasename() { assertTrue(ProcessList.has(PS, "tailscaled")); }
    @Test public void absent() { assertFalse(ProcessList.has(PS, "tailscale")); }
    @Test public void emptyOutput() { assertFalse(ProcessList.has("", "tailscaled")); }
}
