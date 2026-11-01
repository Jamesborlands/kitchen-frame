package com.cottageview.kitchen.core;

import static org.junit.Assert.*;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import org.junit.Test;

public class AdbShellTest {
    static byte[] msg(int cmd, int a0, int a1, String data) {
        return AdbShell.encode(cmd, a0, a1, data == null ? new byte[0] : data.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    @Test public void encodesTheHeaderLikeAdbd() {
        byte[] m = msg(AdbShell.A_OPEN, 1, 0, "shell:id\0");
        ByteBuffer b = ByteBuffer.wrap(m).order(ByteOrder.LITTLE_ENDIAN);
        assertEquals(AdbShell.A_OPEN, b.getInt(0));
        assertEquals(1, b.getInt(4));
        assertEquals(0, b.getInt(8));
        assertEquals(9, b.getInt(12));
        int sum = 0;
        for (byte x : "shell:id\0".getBytes()) sum += x & 0xff;
        assertEquals(sum, b.getInt(16));
        assertEquals(AdbShell.A_OPEN ^ 0xffffffff, b.getInt(20));
        assertEquals(24 + 9, m.length);
    }

    /** A scripted adbd: CNXN back, OKAY to the OPEN, two chunks of output, then CLSE. */
    @Test public void runsAShellCommandAndCollectsOutput() throws Exception {
        ByteArrayOutputStream server = new ByteArrayOutputStream();
        server.write(msg(AdbShell.A_CNXN, 0x01000000, 4096, "device::\0"));
        server.write(msg(AdbShell.A_OKAY, 77, 1, null));
        server.write(msg(AdbShell.A_WRTE, 77, 1, "uid=0(root) "));
        server.write(msg(AdbShell.A_WRTE, 77, 1, "gid=0(root)\n"));
        server.write(msg(AdbShell.A_CLSE, 77, 1, null));
        ByteArrayOutputStream sent = new ByteArrayOutputStream();

        String out = AdbShell.session(new ByteArrayInputStream(server.toByteArray()), sent, "id");
        assertEquals("uid=0(root) gid=0(root)\n", out);

        // we said hello, opened shell:id, and acknowledged each chunk
        DataInputStream in = new DataInputStream(new ByteArrayInputStream(sent.toByteArray()));
        assertEquals(AdbShell.A_CNXN, AdbShell.readMessage(in).command);
        AdbShell.Message open = AdbShell.readMessage(in);
        assertEquals(AdbShell.A_OPEN, open.command);
        assertEquals("shell:id\0", new String(open.data, "UTF-8"));
        assertEquals(AdbShell.A_OKAY, AdbShell.readMessage(in).command);
        assertEquals(AdbShell.A_OKAY, AdbShell.readMessage(in).command);
    }

    @Test(expected = java.io.IOException.class)
    public void refusesWhenAdbdAsksForAuth() throws Exception {
        ByteArrayOutputStream server = new ByteArrayOutputStream();
        server.write(msg(AdbShell.A_AUTH, 1, 0, "token"));
        AdbShell.session(new ByteArrayInputStream(server.toByteArray()), new ByteArrayOutputStream(), "id");
    }

    @Test(expected = java.io.IOException.class)
    public void failsCleanlyWhenTheStreamEndsEarly() throws Exception {
        AdbShell.session(new ByteArrayInputStream(msg(AdbShell.A_CNXN, 0x01000000, 4096, "device::\0")), new ByteArrayOutputStream(), "id");
    }

    @Test public void wrapsAndParsesTheExitCode() {
        assertEquals("pm install -r /x.apk\necho __EXIT=$?", AdbShell.withExit("pm install -r /x.apk"));
        // a backgrounded command must stay valid shell: "cmd &; echo" is a syntax error, "cmd &\necho" isn't
        assertEquals("( sleep 1 ) &\necho __EXIT=$?", AdbShell.withExit("( sleep 1 ) &"));
        AdbShell.Exit e = AdbShell.parseExit("Success\n__EXIT=0\n");
        assertEquals(0, e.code);
        assertEquals("Success\n", e.out);
        AdbShell.Exit bad = AdbShell.parseExit("Failure [INSTALL_FAILED_VERSION_DOWNGRADE]\r\n__EXIT=1\r\n");
        assertEquals(1, bad.code);
        assertEquals(-1, AdbShell.parseExit("no marker").code);
    }
}
