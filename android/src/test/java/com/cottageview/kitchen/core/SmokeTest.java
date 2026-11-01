package com.cottageview.kitchen.core;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

public class SmokeTest {
    @Test public void sha256OfEmpty() {
        assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", Hashes.sha256Hex(new byte[0]));
    }
    @Test public void sha1OfAbc() {
        assertEquals("a9993e364706816aba3e25717850c26c9cd0d89d", Hashes.sha1Hex("abc"));
    }
}
