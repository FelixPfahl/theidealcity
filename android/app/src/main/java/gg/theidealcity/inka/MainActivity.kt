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

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        WebView.setWebContentsDebuggingEnabled(true)
        web = WebView(this)
        setContentView(web)
        Hub.web = web; Hub.activity = this
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
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 8)
        if (!handle(intent?.data)) load()
        OfflineStore.schedule(this)
        Thread { Updates.check(applicationContext) }.start()
    }

    private fun versionName(): String = try { packageManager.getPackageInfo(packageName, 0).versionName ?: "1" } catch (_: Exception) { "1" }

    private fun load() {
        val k = Prefs.key(this)
        web.loadUrl(Hub.PAGE + if (k.isNotBlank()) "#k=$k" else "")
    }

    /** inka://open?k=<Schlüssel>&c=<Spotify-Client-ID> aus der Chrome-Version; inka://spotify-callback von Spotify. */
    private fun handle(u: Uri?): Boolean {
        if (u == null || u.scheme != "inka") return false
        if (u.host == "open") {
            u.getQueryParameter("k")?.let { Prefs.setKey(this, it) }
            u.getQueryParameter("c")?.let { Prefs.setClientId(this, it) }
            load(); OfflineStore.now(this); return true
        }
        return u.host == "spotify-callback"
    }

    override fun onNewIntent(i: Intent) { super.onNewIntent(i); handle(i.data) }

    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, res: IntArray) {
        super.onRequestPermissionsResult(code, perms, res)
        if (code == 7) { val p = pendingPerm; pendingPerm = null
            if (res.firstOrNull() == PackageManager.PERMISSION_GRANTED) p?.grant(p.resources) else p?.deny() }
    }

    override fun onResume() { super.onResume(); Hub.emit(JSONObject().put("type", "app").put("ev", "vorne")) }

    // Bewusst kein web.onPause(): die Show soll im Hintergrund weiterlaufen.

    override fun onDestroy() {
        if (Hub.web === web) { Hub.web = null; Hub.activity = null }
        web.destroy()
        super.onDestroy()
    }

    /** Wird von der Seite aufgerufen: window.InkaNative.* */
    inner class Bridge {
        private val c get() = this@MainActivity

        @JavascriptInterface fun isApp() = true
        @JavascriptInterface fun version() = versionName()
        @JavascriptInterface fun setKey(k: String) { Prefs.setKey(c, k) }
        @JavascriptInterface fun setClientId(id: String) { Prefs.setClientId(c, id) }
        @JavascriptInterface fun clientId(): String = Prefs.clientId(c)
        @JavascriptInterface fun spotifyInstalled(): Boolean = com.spotify.android.appremote.api.SpotifyAppRemote.isSpotifyInstalled(c)
        @JavascriptInterface fun spotifyConnect() { Hub.main.post { SpotifyCtl.connect(c) } }
        @JavascriptInterface fun spotifyPlay(uri: String, posMs: Double) { Hub.main.post { SpotifyCtl.play(c, uri, posMs.toLong()) } }
        @JavascriptInterface fun spotifyPause() { Hub.main.post { SpotifyCtl.pause() } }
        @JavascriptInterface fun spotifyResume() { Hub.main.post { SpotifyCtl.resume(c) } }
        @JavascriptInterface fun spotifyStop() { Hub.main.post { SpotifyCtl.stop() } }
        @JavascriptInterface fun spotifyState(): String = SpotifyCtl.stateJson().toString()
        /** state: playing | paused | stop */
        @JavascriptInterface fun nowPlaying(title: String, sub: String, state: String) { Hub.main.post { PlaybackService.update(c, title, sub, state) } }
        @JavascriptInterface fun keepScreen(on: Boolean) { runOnUiThread { if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) } }
        @JavascriptInterface fun prefetch() { OfflineStore.now(c) }
        @JavascriptInterface fun offlineIds(): String = JSONArray(OfflineStore.cachedIds(c)).toString()
        @JavascriptInterface fun updateInfo(): String = Updates.info(c).toString()
        @JavascriptInterface fun updateCheck() { Thread { Updates.check(c) }.start() }
        @JavascriptInterface fun updateInstall() { Updates.install(c) }
        @JavascriptInterface fun openSpotify() {
            try { startActivity(packageManager.getLaunchIntentForPackage("com.spotify.music")?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) {}
        }
    }
}
