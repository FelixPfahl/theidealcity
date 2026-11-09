package gg.theidealcity.inka

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

/** Die Inka-App: die bekannte Inka-Seite in einer WebView, dazu Hintergrunddienst, Spotify-Steuerung und Offline-Speicher. */
class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var pendingPerm: PermissionRequest? = null
    private var pendingGeo: Pair<String, android.webkit.GeolocationPermissions.Callback>? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        WebView.setWebContentsDebuggingEnabled(true)
        web = WebView(this)
        web.setBackgroundColor(0xFF0C0D14.toInt())
        setContentView(web)
        Hub.web = web; Hub.activity = this; Hub.ctx = applicationContext; Hub.version = versionName()
        // Die Seite bleibt auch bei ausgeschaltetem Bildschirm "wichtig", damit Android sie während eines Songs nicht einfriert
        if (android.os.Build.VERSION.SDK_INT >= 26) try { web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false) } catch (_: Exception) {}
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            @Suppress("DEPRECATION") databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            userAgentString = "$userAgentString InkaApp/" + versionName()
        }
        web.addJavascriptInterface(Bridge(), "InkaNative")
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(v: WebView, r: WebResourceRequest): WebResourceResponse? = OfflineStore.intercept(this@MainActivity, r)
            override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                val u = r.url
                if (u.scheme == "inka") { handle(u); return true }
                if (u.host == "raw.githack.com") return false
                return try { startActivity(Intent(Intent.ACTION_VIEW, u)); true } catch (_: Exception) { false }
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(origin: String, cb: android.webkit.GeolocationPermissions.Callback) {
                val ok = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                    ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                if (ok) cb.invoke(origin, true, true)
                else { pendingGeo = origin to cb; requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION), 9) }
            }
            override fun onPermissionRequest(req: PermissionRequest) {
                runOnUiThread {
                    if (req.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) req.grant(req.resources)
                        else { pendingPerm = req; requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 7) }
                    } else req.deny()
                }
            }
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (web.canGoBack()) web.goBack() else moveTaskToBack(true) }
        })
        askOnce()
        handle(intent?.data)
        if (web.url == null) load()
        OfflineStore.schedule(this)
        Thread { Updates.check(applicationContext) }.start()
    }

    private fun versionName(): String = try { packageManager.getPackageInfo(packageName, 0).versionName ?: "1" } catch (_: Exception) { "1" }

    private fun load() {
        val k = Prefs.key(this)
        web.clearCache(false)
        web.loadUrl(Hub.PAGE + "?v=" + System.currentTimeMillis() + if (k.isNotBlank()) "#k=$k" else "")
    }

    /** inka://open?k=<Schlüssel>&c=<Spotify-Client-ID> aus der Chrome-Version; inka://spotify-callback von Spotify. */
    private fun handle(u: Uri?): Boolean {
        if (u == null || u.scheme != "inka") return false
        if (u.host == "open") {
            u.getQueryParameter("k")?.let { Prefs.setKey(this, it) }
            u.getQueryParameter("c")?.let { Prefs.setClientId(this, it) }
            if (web.url == null || u.getQueryParameter("k") != null) load(); OfflineStore.now(this); return true
        }
        return u.host == "spotify-callback"
    }

    override fun onNewIntent(i: Intent) { super.onNewIntent(i); handle(i.data) }

    /** Josef 9.11.2026: Mikrofon und Standort nur EINMAL freigeben. Die App fragt Android beim ersten Start nach allem auf einmal
     *  (bitte "Bei Nutzung der App" wählen, nicht "Nur dieses Mal"); danach gibt sie der Seite die Rechte ohne Rückfrage weiter. */
    private fun askOnce() {
        val want = mutableListOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (Build.VERSION.SDK_INT >= 33) want.add(Manifest.permission.POST_NOTIFICATIONS)
        val miss = want.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        val sp = getSharedPreferences("inka", MODE_PRIVATE); val n = sp.getInt("permAsked", 0)
        if (miss.isNotEmpty() && n < 3) { sp.edit().putInt("permAsked", n + 1).apply(); requestPermissions(miss.toTypedArray(), 6) }
    }
    private fun has(p: String) = ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, res: IntArray) {
        super.onRequestPermissionsResult(code, perms, res)
        if (code == 6) Hub.emit(JSONObject().put("type", "perms").put("mic", has(Manifest.permission.RECORD_AUDIO)).put("geo", has(Manifest.permission.ACCESS_FINE_LOCATION) || has(Manifest.permission.ACCESS_COARSE_LOCATION)))
        if (code == 9) { val g = pendingGeo; pendingGeo = null; g?.second?.invoke(g.first, res.any { it == PackageManager.PERMISSION_GRANTED }, true) }
        if (code == 7) { val p = pendingPerm; pendingPerm = null
            if (res.firstOrNull() == PackageManager.PERMISSION_GRANTED) p?.grant(p.resources) else p?.deny() }
    }

    override fun onResume() {
        super.onResume(); Hub.emit(JSONObject().put("type", "app").put("ev", "vorne"))
        // Josef 2.11.2026: Spotify früh verbinden, solange Netz da ist (die Anmeldung bei Spotify braucht Netz, eine bestehende Verbindung nicht)
        if (Prefs.clientId(this).isNotBlank()) Hub.main.post { SpotifyCtl.connect(this) }
    }

    // Bewusst kein web.onPause(): die Show soll im Hintergrund weiterlaufen.

    override fun onDestroy() {
        if (Hub.web === web) { Hub.web = null; Hub.activity = null; PlaybackService.update(this, "", "", "stop"); SpotifyCtl.stop(); Voice.release() }
        web.destroy()
        super.onDestroy()
    }

    /** Wird von der Seite aufgerufen: window.InkaNative.* */
    inner class Bridge {
        private val c get() = this@MainActivity

        @JavascriptInterface fun isApp() = true
        /** Stand der Android-Rechte, damit die Seite nicht jedes Mal "Erlauben" zeigt (ab 1.4.0). */
        @JavascriptInterface fun perms(): String = JSONObject().put("mic", has(Manifest.permission.RECORD_AUDIO))
            .put("geo", has(Manifest.permission.ACCESS_FINE_LOCATION) || has(Manifest.permission.ACCESS_COARSE_LOCATION)).toString()
        @JavascriptInterface fun askPerms() { runOnUiThread { getSharedPreferences("inka", MODE_PRIVATE).edit().putInt("permAsked", 0).apply(); askOnce() } }
        /** Offene Aufträge ans Sekretariat: die App sendet sie nach, bis eine Quittung kommt (ntfy hält Nachrichten nur 12 Stunden). */
        @JavascriptInterface fun queueSet(json: String) { Outbox.set(c, json) }
        /** Daten für das Widget "Als Nächstes". */
        @JavascriptInterface fun widgetSet(json: String) { NextWidget.save(c, json) }
        /** Inka Live (claude.ai, live Kalender, Todoist, Gmail) im eingebetteten Chrome-Tab: nutzt die claude.ai-Anmeldung aus Chrome (ab 1.5.0). */
        @JavascriptInterface fun openLive(url: String) { runOnUiThread { try {
            androidx.browser.customtabs.CustomTabsIntent.Builder().setShowTitle(true)
                .setDefaultColorSchemeParams(androidx.browser.customtabs.CustomTabColorSchemeParams.Builder().setToolbarColor(0xFF0C0D14.toInt()).build())
                .build().launchUrl(c, Uri.parse(url))
        } catch (_: Exception) { try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {} } } }
        /** Eigene Benachrichtigungen: Abfahrt 10 min vorher, Fristen morgens (ab 1.5.0). json = [{id, at (ms), title, text}] */
        @JavascriptInterface fun alarmsSet(json: String) { Alarms.set(c, json) }
        @JavascriptInterface fun vibrate(ms: Int) { try {
            val v = if (Build.VERSION.SDK_INT >= 31) (getSystemService(android.os.VibratorManager::class.java)).defaultVibrator else @Suppress("DEPRECATION") (getSystemService(VIBRATOR_SERVICE) as android.os.Vibrator)
            v.vibrate(android.os.VibrationEffect.createOneShot(ms.toLong().coerceIn(5, 200), android.os.VibrationEffect.DEFAULT_AMPLITUDE))
        } catch (_: Exception) {} }
        @JavascriptInterface fun version() = versionName()
        @JavascriptInterface fun setKey(k: String) { Prefs.setKey(c, k) }
        @JavascriptInterface fun setTopic(t: String) { Prefs.setTopic(c, t) }
        /** Diagnose der Seite über die App senden: im Hintergrund kommt das Netz der WebView oft nicht durch (2.11.2026). */
        @JavascriptInterface fun diag(json: String) { try { val o = org.json.JSONObject(json); Hub.diag(o.optString("ev", "?"), o, keepAv = true) } catch (_: Exception) {} }
        @JavascriptInterface fun setClientId(id: String) { Prefs.setClientId(c, id) }
        @JavascriptInterface fun clientId(): String = Prefs.clientId(c)
        @JavascriptInterface fun spotifyInstalled(): Boolean = com.spotify.android.appremote.api.SpotifyAppRemote.isSpotifyInstalled(c)
        @JavascriptInterface fun spotifyConnect() { Hub.main.post { SpotifyCtl.connect(c) } }
        @JavascriptInterface fun spotifyPlay(uri: String, posMs: Double) { Hub.main.post { SpotifyCtl.play(c, uri, posMs.toLong()) } }
        @JavascriptInterface fun spotifyPause() { Hub.main.post { SpotifyCtl.pause() } }
        @JavascriptInterface fun spotifyResume() { Hub.main.post { SpotifyCtl.resume(c) } }
        @JavascriptInterface fun spotifyStop() { Hub.main.post { SpotifyCtl.stop() } }
        @JavascriptInterface fun spotifyState(): String = SpotifyCtl.stateJson().toString()
        @JavascriptInterface fun spotifyKeep(on: Boolean) { Hub.main.post { SpotifyCtl.keepAlive(c, on) } }
        @JavascriptInterface fun spotifyDuck(on: Boolean) { Hub.main.post { SpotifyCtl.duck(c, on) } }
        @JavascriptInterface fun radioBed(db: Double) { Bed.setBedDb(c, db.toInt()) }
        @JavascriptInterface fun radioBedDb(): Int = Bed.bedDb(c)
        /** Eigener Sprachkanal (1.7.0): Status, Einrichten, getrennte Regler für Sprache und Musik. */
        @JavascriptInterface fun voiceChannel(): String = JSONObject().put("dienst", InkaKanal.running).put("aktiv", Voice.ownChannel()).toString()
        @JavascriptInterface fun openChannelSetup() { Hub.main.post { try { startActivity(Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) {} } }
        @JavascriptInterface fun volumes(): String {
            val a = getSystemService(AUDIO_SERVICE) as android.media.AudioManager
            return JSONObject().put("sprache", a.getStreamVolume(android.media.AudioManager.STREAM_ACCESSIBILITY)).put("spracheMax", a.getStreamMaxVolume(android.media.AudioManager.STREAM_ACCESSIBILITY))
                .put("musik", a.getStreamVolume(android.media.AudioManager.STREAM_MUSIC)).put("musikMax", a.getStreamMaxVolume(android.media.AudioManager.STREAM_MUSIC)).toString()
        }
        @JavascriptInterface fun volumeSet(which: String, idx: Int) {
            Hub.main.post {
                val a = getSystemService(AUDIO_SERVICE) as android.media.AudioManager
                val st = if (which == "sprache") android.media.AudioManager.STREAM_ACCESSIBILITY else android.media.AudioManager.STREAM_MUSIC
                try { a.setStreamVolume(st, idx.coerceIn(0, a.getStreamMaxVolume(st)), 0) } catch (e: Exception) { Hub.log("Lautstärke setzen: " + e.javaClass.simpleName) }
            }
        }
        @JavascriptInterface fun spNorm(on: Boolean) { Hub.main.post { Voice.setSpNormQuiet(c, on) } }
        @JavascriptInterface fun spNormOn(): Boolean = Voice.spNormQuiet(c)
        /** Spielt gerade eine andere App Ton (Video, Sprachnachricht)? Dann wartet Inka nach einer fremden Unterbrechung, statt sich vorzudrängen. */
        // Inkas Stimme über den Android-Player (ab 1.2.0)
        @JavascriptInterface fun voiceLoad(id: String, t: String) { Hub.main.post { Voice.load(c, id, t) } }
        @JavascriptInterface fun voicePlay() { Hub.main.post { Voice.play(true) } }
        @JavascriptInterface fun voicePause() { Hub.main.post { Voice.pause(true) } }
        @JavascriptInterface fun voiceSeek(ms: Double) { Hub.main.post { Voice.seek(ms.toLong()) } }
        @JavascriptInterface fun voiceState(): String = Voice.state().toString()
        @JavascriptInterface fun voicePos(): Double = Voice.pos().toDouble()
        @JavascriptInterface fun voicePlaying(): Boolean = Voice.playing()
        @JavascriptInterface fun voiceVolume(v: Double) { Hub.main.post { Voice.setVolume(v.toFloat()) } }
        @JavascriptInterface fun voiceRate(r: Double) { Hub.main.post { Voice.setRate(r.toFloat()) } }
        @JavascriptInterface fun voiceEq(bass: Double, treble: Double) { Hub.main.post { Voice.setEq(bass.toInt(), treble.toInt()) } }
        @JavascriptInterface fun voiceStops(json: String, pre: Boolean) { Hub.main.post { Voice.setStops(json, pre) } }
        @JavascriptInterface fun voiceUnload() { Hub.main.post { Voice.release() } }
        @JavascriptInterface fun otherAudio(): Boolean = try { (c.getSystemService(android.content.Context.AUDIO_SERVICE) as android.media.AudioManager).isMusicActive } catch (_: Exception) { false }
        /** uris als JSON-Liste; speichert sie in Spotify "Lieblingssongs" */
        @JavascriptInterface fun saveSongs(json: String) {
            val l = try { val a = JSONArray(json); (0 until a.length()).map { a.getString(it) }.filter { it.startsWith("spotify:track:") } } catch (_: Exception) { emptyList() }
            Hub.main.post { SpotifyCtl.saveToLibrary(c, l) }
        }
        /** state: playing | paused | stop */
        @JavascriptInterface fun nowPlaying(title: String, sub: String, state: String) { Hub.main.post { PlaybackService.update(c, title, sub, state) } }
        @JavascriptInterface fun keepScreen(on: Boolean) { runOnUiThread { if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) } }
        @JavascriptInterface fun prefetch() { OfflineStore.now(c) }
        @JavascriptInterface fun offlineIds(): String = JSONArray(OfflineStore.cachedIds(c)).toString()
        @JavascriptInterface fun updateInfo(): String = Updates.info(c).toString()
        @JavascriptInterface fun updateCheck() { Thread { Updates.check(c) }.start() }
        @JavascriptInterface fun updateInstall() { Updates.install(c) }
        /** Show als Audio und Text an Drive oder andere Apps teilen (Josef 1.11.2026). */
        @JavascriptInterface fun shareShow(id: String, name: String, text: String) { Thread { Share.show(c, id, name, text) }.start() }
        @JavascriptInterface fun openSpotify() {
            try { startActivity(packageManager.getLaunchIntentForPackage("com.spotify.music")?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) {}
        }
    }
}
