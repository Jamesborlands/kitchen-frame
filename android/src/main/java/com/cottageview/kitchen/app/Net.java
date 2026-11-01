package com.cottageview.kitchen.app;

import com.cottageview.kitchen.core.ServerConfig;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.KeyStore;
import java.security.Provider;
import java.security.Security;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.util.Enumeration;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManagerFactory;

/**
 * HTTPS for Android 4.4: the platform TLS can't reach Vercel/Cloudflare (no
 * GCM/ChaCha suites, TLS1.2 off by default), so Conscrypt is the provider; trust
 * is the system CAs plus a bundled ISRG Root X1 (missing from 4.4's store).
 * Every request carries the frame key.
 */
public final class Net {
    public static final class HttpError extends IOException {
        public final int code;
        HttpError(int code, String url) { super("HTTP " + code + " " + url); this.code = code; }
    }

    static final int MAX_BYTES = 20 * 1024 * 1024;
    private final ServerConfig cfg;
    private final SSLSocketFactory tls;

    public Net(ServerConfig cfg, SSLSocketFactory tls) { this.cfg = cfg; this.tls = tls; }

    public static SSLSocketFactory tls(InputStream isrgPem) throws Exception {
        Provider prov = org.conscrypt.Conscrypt.newProvider();
        Security.insertProviderAt(prov, 1);
        KeyStore sys = KeyStore.getInstance("AndroidCAStore");
        sys.load(null, null);
        KeyStore ks = KeyStore.getInstance(KeyStore.getDefaultType());
        ks.load(null, null);
        for (Enumeration<String> e = sys.aliases(); e.hasMoreElements(); ) {
            String a = e.nextElement();
            ks.setCertificateEntry(a, sys.getCertificate(a));
        }
        Certificate x1 = CertificateFactory.getInstance("X.509").generateCertificate(isrgPem);
        ks.setCertificateEntry("isrg-root-x1", x1);
        TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        tmf.init(ks);
        SSLContext ctx = SSLContext.getInstance("TLS", prov);
        ctx.init(null, tmf.getTrustManagers(), null);
        return ctx.getSocketFactory();
    }

    public byte[] get(String pathOrUrl) throws IOException { return send("GET", pathOrUrl, null, null); }

    public byte[] post(String path, byte[] body, String contentType) throws IOException { return send("POST", path, body, contentType); }

    private byte[] send(String method, String pathOrUrl, byte[] body, String contentType) throws IOException {
        String url = cfg.resolve(pathOrUrl);
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            if (c instanceof HttpsURLConnection) ((HttpsURLConnection) c).setSSLSocketFactory(tls);
            c.setConnectTimeout(15_000);
            c.setReadTimeout(30_000);
            c.setInstanceFollowRedirects(false); // a redirect means /unlock — i.e. our key was refused
            c.setRequestMethod(method);
            if (cfg.key != null && url.startsWith(cfg.baseUrl)) c.setRequestProperty("Authorization", "Bearer " + cfg.key);
            if (body != null) {
                c.setDoOutput(true);
                c.setRequestProperty("Content-Type", contentType);
                c.setFixedLengthStreamingMode(body.length);
                try (OutputStream o = c.getOutputStream()) { o.write(body); }
            }
            int code = c.getResponseCode();
            if (code < 200 || code >= 300) throw new HttpError(code, url);
            try (InputStream in = c.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[16 * 1024];
                int n, total = 0;
                while ((n = in.read(buf)) > 0) {
                    total += n;
                    if (total > MAX_BYTES) throw new IOException("response too large");
                    out.write(buf, 0, n);
                }
                return out.toByteArray();
            }
        } finally {
            c.disconnect();
        }
    }
}
