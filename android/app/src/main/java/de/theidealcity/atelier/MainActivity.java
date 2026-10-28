package de.theidealcity.atelier;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/**
 * Atelier: Hülle für Josefs Web-Apps (Atelier, Pult, Morgenrunde).
 * Alle Seiten laufen unter https://app.atelier/<app>/... . Jede Datei wird zuerst frisch von GitHub geholt
 * (raw.githubusercontent.com), gespeichert und ausgeliefert; ohne Netz kommt der gespeicherte Stand,
 * beim allerersten Start ohne Netz die mitgelieferte Fassung aus der APK.
 */
public class MainActivity extends Activity {
    static final String HOST = "app.atelier";
    static final String ORIGIN = "https://" + HOST + "/";
    static final String START = ORIGIN + "atelier/index.html";
    static final String RAW = "https://raw.githubusercontent.com/FelixPfahl/theidealcity/";
    static final String HACK = "https://raw.githack.com/FelixPfahl/theidealcity/";
    /** App-Ordner -> {Zweig, Unterordner im Zweig} */
    static final Map<String, String[]> APPS = new HashMap<>();
    static {
        APPS.put("atelier", new String[]{"atelier", ""});
        APPS.put("pult", new String[]{"pult", ""});
        APPS.put("morgenrunde", new String[]{"morgenrunde", "morgenrunde/web/"});
    }
    private WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0B0C10);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " AtelierApp/2");

        web.addJavascriptInterface(new Bridge(), "AtelierApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                String url = req.getUrl().toString();
                if (url.startsWith(ORIGIN)) return false;
                String mapped = fromHack(url);
                if (mapped != null) { view.loadUrl(mapped); return true; }
                try { startActivity(new Intent(Intent.ACTION_VIEW, req.getUrl())); } catch (Exception ignored) { }
                return true;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                String url = req.getUrl().toString();
                if (url.startsWith(HACK)) {
                    String mapped = fromHack(url);
                    if (mapped != null) url = mapped;
                }
                if (!url.startsWith(ORIGIN)) return null;
                return serve(url);
            }
        });

        if (state != null) web.restoreState(state);
        else web.loadUrl(startUrl(getIntent()));
    }

    /** raw.githack.com/FelixPfahl/theidealcity/<zweig>/<pfad> -> https://app.atelier/<app>/<pfad> */
    static String fromHack(String url) {
        if (!url.startsWith(HACK)) return null;
        String rest = url.substring(HACK.length());
        int q = rest.indexOf('?'); if (q >= 0) rest = rest.substring(0, q);
        int slash = rest.indexOf('/');
        if (slash < 0) return null;
        String branch = rest.substring(0, slash), path = rest.substring(slash + 1);
        for (Map.Entry<String, String[]> e : APPS.entrySet()) {
            String[] v = e.getValue();
            if (v[0].equals(branch) && path.startsWith(v[1])) return ORIGIN + e.getKey() + "/" + path.substring(v[1].length());
        }
        return null;
    }

    private WebResourceResponse serve(String url) {
        String rel = url.substring(ORIGIN.length());
        int q = rel.indexOf('?'); if (q >= 0) rel = rel.substring(0, q);
        int h = rel.indexOf('#'); if (h >= 0) rel = rel.substring(0, h);
        if (rel.endsWith("/")) rel += "index.html";
        if (rel.contains("..")) return notFound();
        int slash = rel.indexOf('/');
        if (slash < 0) return notFound();
        String app = rel.substring(0, slash), path = rel.substring(slash + 1);
        String[] v = APPS.get(app);
        if (v == null) return notFound();
        String mime = mime(path);
        File cache = new File(getFilesDir(), "web/" + rel);

        // 1. frisch von GitHub
        int status = -1;
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(RAW + v[0] + "/" + v[1] + path + "?t=" + (System.currentTimeMillis() / 60000)).openConnection();
            c.setConnectTimeout(3500);
            c.setReadTimeout(5000);
            c.setUseCaches(false);
            status = c.getResponseCode();
            if (status == 200) {
                byte[] data = readAll(c.getInputStream());
                cache.getParentFile().mkdirs();
                File tmp = new File(cache.getPath() + ".tmp");
                try (FileOutputStream out = new FileOutputStream(tmp)) { out.write(data); }
                tmp.renameTo(cache);
                return ok(mime, new ByteArrayInputStream(data));
            }
        } catch (Exception ignored) { }
        if (status == 404) return notFound();
        // 2. gespeicherter Stand
        try { if (cache.exists()) return ok(mime, new FileInputStream(cache)); } catch (Exception ignored) { }
        // 3. mitgelieferte Fassung
        try { return ok(mime, getAssets().open("web/" + rel)); } catch (Exception ignored) { }
        if (path.endsWith(".html")) {
            try { return ok("text/html", getAssets().open("offline.html")); } catch (Exception ignored) { }
        }
        return notFound();
    }

    private static byte[] readAll(InputStream in) throws Exception {
        try (InputStream i = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16384]; int n;
            while ((n = i.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }

    private static WebResourceResponse ok(String mime, InputStream in) {
        WebResourceResponse r = new WebResourceResponse(mime, "utf-8", in);
        Map<String, String> hd = new HashMap<>();
        hd.put("Cache-Control", "no-store");
        hd.put("Access-Control-Allow-Origin", "*");
        r.setResponseHeaders(hd);
        return r;
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    private static String mime(String p) {
        String l = p.toLowerCase();
        if (l.endsWith(".html") || l.endsWith(".htm")) return "text/html";
        if (l.endsWith(".json") || l.endsWith(".webmanifest")) return "application/json";
        if (l.endsWith(".js")) return "text/javascript";
        if (l.endsWith(".css")) return "text/css";
        if (l.endsWith(".svg")) return "image/svg+xml";
        if (l.endsWith(".png")) return "image/png";
        if (l.endsWith(".jpg") || l.endsWith(".jpeg")) return "image/jpeg";
        if (l.endsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }

    /** Optional: Start-URL per Intent-Extra "url" (nur eigene Seiten), z. B. für Tests. */
    private String startUrl(Intent i) {
        String u = i != null ? i.getStringExtra("url") : null;
        if (u == null) return START;
        if (u.startsWith(ORIGIN)) return u;
        String m = fromHack(u);
        return m != null ? m : START;
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        if (i != null && i.getStringExtra("url") != null) web.loadUrl(startUrl(i));
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    /** Für die Web-Apps: window.AtelierApp.vibrate(ms), .retry(), .isApp() */
    class Bridge {
        @JavascriptInterface
        public void vibrate(long ms) {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
            else v.vibrate(ms);
        }

        @JavascriptInterface
        public void retry() { runOnUiThread(() -> web.loadUrl(START)); }

        @JavascriptInterface
        public boolean isApp() { return true; }
    }
}
