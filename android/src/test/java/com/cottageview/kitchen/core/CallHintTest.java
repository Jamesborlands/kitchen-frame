package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import org.junit.Test;

public class CallHintTest {
    @Test public void sameRulesAsTheWeb() {
        assertEquals("good time to call", CallHint.forHour(9));
        assertEquals("good time to call", CallHint.forHour(20));
        assertEquals("maybe early or late", CallHint.forHour(7));
        assertEquals("maybe early or late", CallHint.forHour(22));
        assertEquals("probably asleep", CallHint.forHour(23));
        assertEquals("probably asleep", CallHint.forHour(3));
    }
}
