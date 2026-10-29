package de.theidealcity.atelier;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.graphics.Typeface;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.content.pm.PackageManager;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
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
    static final String[] TABS = {"atelier", "pult", "morgenrunde"};
    /** Leiste unten: Heute (Atelier), Pult, Fernbedienung (Pult, Ansicht fern). Morgenrunde läuft als Reiter ohne Knopf, geöffnet über die Kachel. */
    static final String[] BAR = {"atelier", "pult", "fern"};
    static final String[] LABELS = {"Heute", "Pult", "Fernbedienung"};
    static final int BG = 0xFF0B0C10, LINE = 0xFF262A33, FG = 0xFFECEEF3, MUTED = 0xFF8B91A0, ACCENT = 0xFF0028FF;
    private final WebView[] views = new WebView[TABS.length];
    private final TextView[] tabs = new TextView[BAR.length];
    private volatile String pultView = "jetzt";
    private FrameLayout stage;
    private int current = 0;
    /** Darf die Startseite einmal automatisch zu Pult springen? Nur beim normalen Start, bis du selbst einen Reiter tippst. */
    private boolean autoTabAllowed = false;
    private WebView web; // aktuelle Ansicht
    /** Lautstärketasten als Fernbedienung, solange Pult mit dem Notebook gekoppelt ist */
    private volatile boolean fernAktiv = false;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);

        stage = new FrameLayout(this);
        root.addView(stage, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        View line = new View(this);
        line.setBackgroundColor(LINE);
        root.addView(line, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(1)));

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setBackgroundColor(0xFF07080B);
        for (int i = 0; i < BAR.length; i++) {
            final String id = BAR[i];
            TextView t = new TextView(this);
            t.setText(LABELS[i]);
            t.setGravity(Gravity.CENTER);
            t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
            t.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
            t.setPadding(0, dp(12), 0, dp(12));
            t.setOnClickListener(v -> { autoTabAllowed = false; go(id, true); });
            t.setContentDescription(LABELS[i]);
            tabs[i] = t;
            bar.addView(t, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        }
        root.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        setContentView(root);

        int startTab = 0;
        String wanted = getIntent() != null ? getIntent().getStringExtra("tab") : null;
        if (state != null) startTab = state.getInt("tab", 0);
        else if (wanted != null) startTab = Math.max(0, indexOf(wanted));
        autoTabAllowed = state == null && wanted == null && (getIntent() == null || getIntent().getStringExtra("url") == null);
        show(startTab);
        String u = getIntent() != null ? getIntent().getStringExtra("url") : null;
        if (state == null && u != null) open(startUrl(getIntent()));
        /* Benachrichtigungen (Phasenwechsel bei gesperrtem Handy) einmal erlauben lassen */
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED
                && !getSharedPreferences(PhaseAlarm.PREFS, 0).getBoolean("gefragt", false)) {
            getSharedPreferences(PhaseAlarm.PREFS, 0).edit().putBoolean("gefragt", true).apply();
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 7);
        }
    }

    @Override
    protected void onResume() { super.onResume(); PhaseAlarm.appVisible = true; }

    @Override
    protected void onPause() { PhaseAlarm.appVisible = false; super.onPause(); }

    /** Lauter = Folie weiter, Leiser = Folie zurück (nur gekoppelt; sonst normale Lautstärke) */
    @Override
    public boolean dispatchKeyEvent(KeyEvent ev) {
        int k = ev.getKeyCode();
        int p = indexOf("pult");
        if (fernAktiv && p >= 0 && views[p] != null && (k == KeyEvent.KEYCODE_VOLUME_UP || k == KeyEvent.KEYCODE_VOLUME_DOWN)) {
            if (ev.getAction() == KeyEvent.ACTION_DOWN && ev.getRepeatCount() == 0) {
                String cmd = k == KeyEvent.KEYCODE_VOLUME_UP ? "next" : "prev";
                views[p].evaluateJavascript("window.AtelierFern&&AtelierFern('" + cmd + "')", null);
            }
            return true;
        }
        return super.dispatchKeyEvent(ev);
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    static int indexOf(String app) {
        for (int i = 0; i < TABS.length; i++) if (TABS[i].equals(app)) return i;
        return -1;
    }

    /** App-Name aus einer https://app.atelier/<app>/... Adresse */
    static String appOf(String url) {
        if (url == null || !url.startsWith(ORIGIN)) return null;
        String rest = url.substring(ORIGIN.length());
        int s = rest.indexOf('/');
        return s > 0 ? rest.substring(0, s) : null;
    }

    private WebView view(int i) { return view(i, null); }

    private WebView view(int i, String query) {
        if (views[i] != null) return views[i];
        WebView w = makeView(i);
        views[i] = w;
        stage.addView(w, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        w.loadUrl(ORIGIN + TABS[i] + "/index.html" + (query != null ? query : ""));
        return w;
    }

    /** Wechsel per Leiste oder Kachel. "fern" = Pult in der Ansicht Fernbedienung. Der Stand jeder App bleibt erhalten. */
    void go(String id, boolean fromBar) {
        if ("fern".equals(id)) {
            int p = indexOf("pult");
            boolean fresh = views[p] == null;
            view(p, "?ansicht=fern");
            show(p);
            if (!fresh) views[p].evaluateJavascript("window.AtelierSetView&&AtelierSetView('fern')", null);
            pultView = "fern";
            updateBar();
            return;
        }
        int i = indexOf(id);
        if (i < 0) return;
        show(i);
        if (fromBar && "pult".equals(id) && "fern".equals(pultView) && views[i] != null) {
            views[i].evaluateJavascript("window.AtelierSetView&&AtelierSetView('jetzt')", null);
            pultView = "jetzt";
            updateBar();
        }
    }

    /** Welcher Knopf der Leiste leuchtet */
    int barIndex() {
        String t = TABS[current];
        if ("pult".equals(t)) return "fern".equals(pultView) ? 2 : 1;
        if ("atelier".equals(t)) return 0;
        return -1;
    }

    void updateBar() {
        int sel = barIndex();
        for (int k = 0; k < BAR.length; k++) {
            tabs[k].setTextColor(k == sel ? FG : MUTED);
            tabs[k].setSelected(k == sel);
            android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
            g.setColor(k == sel ? 0xFF15171D : 0xFF07080B);
            android.graphics.drawable.LayerDrawable ld;
            if (k == sel) {
                android.graphics.drawable.ColorDrawable u = new android.graphics.drawable.ColorDrawable(ACCENT);
                ld = new android.graphics.drawable.LayerDrawable(new android.graphics.drawable.Drawable[]{g, u});
                ld.setLayerInset(1, dp(24), 0, dp(24), 0);
                ld.setLayerGravity(1, Gravity.TOP);
                ld.setLayerHeight(1, dp(3));
            } else {
                ld = new android.graphics.drawable.LayerDrawable(new android.graphics.drawable.Drawable[]{g});
            }
            tabs[k].setBackground(ld);
        }
    }

    /** Reiter zeigen; die anderen Ansichten laufen im Hintergrund weiter (Pult-Uhr, Vibration). */
    void show(int i) {
        current = i;
        web = view(i);
        for (int k = 0; k < TABS.length; k++) {
            if (views[k] != null) views[k].setVisibility(k == i ? View.VISIBLE : View.GONE);
        }
        updateBar();
    }

    /** Adresse im passenden Reiter öffnen */
    void open(String url) {
        String app = appOf(url);
        int i = app != null ? indexOf(app) : -1;
        if (i < 0) return;
        WebView w = view(i);
        String cur = w.getUrl();
        if (cur == null || !stripQuery(cur).equals(stripQuery(url))) w.loadUrl(url);
        show(i);
    }

    static String stripQuery(String u) {
        int q = u.indexOf('?'); if (q >= 0) u = u.substring(0, q);
        int h = u.indexOf('#'); if (h >= 0) u = u.substring(0, h);
        return u;
    }

    private WebView makeView(int index) {
        final String home = TABS[index];
        WebView w = new WebView(this);
        w.setBackgroundColor(BG);
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " AtelierApp/3");
        w.addJavascriptInterface(new Bridge(), "AtelierApp");
        w.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                String url = req.getUrl().toString();
                String mapped = url.startsWith(ORIGIN) ? url : fromHack(url);
                if (mapped != null) {
                    String app = appOf(mapped);
                    if (home.equals(app)) {
                        if (mapped.equals(url)) return false;
                        view.loadUrl(mapped);
                        return true;
                    }
                    open(mapped);
                    return true;
                }
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
        return w;
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
        if (i == null) return;
        autoTabAllowed = false;
        if (i.getStringExtra("url") != null) open(startUrl(i));
        else if (i.getStringExtra("tab") != null && indexOf(i.getStringExtra("tab")) >= 0) show(indexOf(i.getStringExtra("tab")));
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        out.putInt("tab", current);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else if (current != 0) show(0);
        else super.onBackPressed();
    }

    /** Für die Web-Apps: window.AtelierApp.vibrate(ms), .retry(), .openTab(app), .switchTab(app), .pultView(v), .isApp(), .plan(json), .fern(an) */
    class Bridge {
        @JavascriptInterface
        public void vibrate(long ms) {
            if (!PhaseAlarm.appVisible) return;   /* im Hintergrund vibriert der Wecker (PhaseAlarm), nicht doppelt */
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
            else v.vibrate(ms);
        }

        @JavascriptInterface
        public void retry() { runOnUiThread(() -> { if (web != null) web.reload(); }); }

        /** Automatischer Sprung beim Start (z. B. während einer Stunde zu Pult). Wirkt nur einmal und nur, solange du keinen Reiter getippt hast. */
        @JavascriptInterface
        public void openTab(String app) {
            int i = indexOf(app);
            if (i < 0) return;
            runOnUiThread(() -> {
                if (!autoTabAllowed) return;
                autoTabAllowed = false;
                show(i);
            });
        }

        /** Wechsel auf Wunsch (Kachel): wirkt immer. app = atelier, pult, fern oder morgenrunde. */
        @JavascriptInterface
        public void switchTab(String app) {
            runOnUiThread(() -> { autoTabAllowed = false; go(app, false); });
        }

        /** Pult meldet seine Ansicht, damit die Leiste Pult oder Fernbedienung zeigt. */
        @JavascriptInterface
        public void pultView(String v) {
            pultView = v == null ? "jetzt" : v;
            runOnUiThread(() -> updateBar());
        }

        @JavascriptInterface
        public boolean isApp() { return true; }

        /** Pult übergibt den Phasenplan des Tages (JSON): Wecker und Benachrichtigung bei gesperrtem Handy */
        @JavascriptInterface
        public void plan(String json) {
            if (json == null || json.length() > 200000) return;
            PhaseAlarm.setPlan(getApplicationContext(), json);
        }

        /** Pult meldet, ob es gekoppelt ist (dann steuern die Lautstärketasten die Folien) */
        @JavascriptInterface
        public void fern(boolean an) { fernAktiv = an; }
    }
}
