package com.cottageview.kitchen.core;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * Runs a shell command through the frame's own adbd, which runs as root and
 * listens on localhost:5555 without auth (ro.adb.secure=0). The app needs root
 * for screenshots, logs and silent installs, but this frame's su refuses apps
 * (it only allows root and shell) — talking ADB to ourselves gets a root shell
 * without changing /system. This class is the wire protocol over plain streams
 * (testable on the JVM); app/Root opens the socket.
 */
public final class AdbShell {
    private AdbShell() {}

    public static final int A_CNXN = 0x4e584e43, A_OPEN = 0x4e45504f, A_OKAY = 0x59414b4f,
        A_WRTE = 0x45545257, A_CLSE = 0x45534c43, A_AUTH = 0x48545541;
    static final int VERSION = 0x01000000, MAX_DATA = 4096, LOCAL_ID = 1;
    static final int MAX_OUTPUT = 4 * 1024 * 1024;

    public static final class Message {
        public final int command, arg0, arg1;
        public final byte[] data;
        Message(int command, int arg0, int arg1, byte[] data) {
            this.command = command; this.arg0 = arg0; this.arg1 = arg1; this.data = data;
        }
    }

    public static byte[] encode(int command, int arg0, int arg1, byte[] data) {
        int sum = 0;
        for (byte b : data) sum += b & 0xff; // adbd on 4.4 still checks this "crc"
        ByteBuffer buf = ByteBuffer.allocate(24 + data.length).order(ByteOrder.LITTLE_ENDIAN);
        buf.putInt(command).putInt(arg0).putInt(arg1).putInt(data.length).putInt(sum).putInt(command ^ 0xffffffff);
        buf.put(data);
        return buf.array();
    }

    public static Message readMessage(DataInputStream in) throws IOException {
        byte[] head = new byte[24];
        in.readFully(head);
        ByteBuffer b = ByteBuffer.wrap(head).order(ByteOrder.LITTLE_ENDIAN);
        int command = b.getInt(), arg0 = b.getInt(), arg1 = b.getInt(), len = b.getInt();
        if (len < 0 || len > 1024 * 1024) throw new IOException("adb: bad length " + len);
        byte[] data = new byte[len];
        in.readFully(data);
        return new Message(command, arg0, arg1, data);
    }

    /** Connect, run `shell:<cmd>`, and return everything it printed. */
    public static String session(InputStream rawIn, OutputStream out, String cmd) throws IOException {
        DataInputStream in = new DataInputStream(rawIn);
        out.write(encode(A_CNXN, VERSION, MAX_DATA, ascii("host::\0")));
        out.flush();
        while (true) {
            Message m = readMessage(in);
            if (m.command == A_CNXN) break;
            if (m.command == A_AUTH) throw new IOException("adb: device wants auth (ro.adb.secure is on)");
        }
        out.write(encode(A_OPEN, LOCAL_ID, 0, ascii("shell:" + cmd + "\0")));
        out.flush();
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        while (true) {
            Message m = readMessage(in);
            if (m.command == A_WRTE) {
                if (result.size() + m.data.length <= MAX_OUTPUT) result.write(m.data);
                out.write(encode(A_OKAY, LOCAL_ID, m.arg0, new byte[0]));
                out.flush();
            } else if (m.command == A_CLSE) {
                out.write(encode(A_CLSE, LOCAL_ID, m.arg0, new byte[0]));
                out.flush();
                return result.toString("UTF-8");
            }
            // A_OKAY (stream opened) and anything else: keep reading
        }
    }

    /** adb's shell protocol (v1) carries no exit status, so we print it ourselves. */
    public static String withExit(String cmd) { return cmd + "\necho __EXIT=$?"; } // newline, not ";": "cmd &; echo" is a syntax error

    public static final class Exit {
        public final int code;
        public final String out;
        Exit(int code, String out) { this.code = code; this.out = out; }
    }

    public static Exit parseExit(String output) {
        int i = output.lastIndexOf("__EXIT=");
        if (i < 0) return new Exit(-1, output);
        String rest = output.substring(i + "__EXIT=".length()).trim();
        int code;
        try { code = Integer.parseInt(rest); } catch (NumberFormatException e) { code = -1; }
        return new Exit(code, output.substring(0, i));
    }

    private static byte[] ascii(String s) {
        try { return s.getBytes("UTF-8"); } catch (java.io.UnsupportedEncodingException e) { throw new IllegalStateException(e); }
    }
}
