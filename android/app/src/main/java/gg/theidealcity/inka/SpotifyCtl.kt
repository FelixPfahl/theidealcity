package gg.theidealcity.inka

import android.content.Context
import com.spotify.android.appremote.api.ConnectionParams
import com.spotify.android.appremote.api.Connector
import com.spotify.android.appremote.api.SpotifyAppRemote
import com.spotify.protocol.types.PlayerState
import org.json.JSONObject

/**
 * Steuert die Spotify-App direkt (App Remote SDK).
 * Josef 1.11.2026: "Spotify verliert immer wieder die Verbindung ... eine verlorene Verbindung erkennen und wiederherstellen".
 * Bricht die Verbindung ab, wird neu verbunden und der gewünschte Song an derselben Stelle fortgesetzt.
 */
object SpotifyCtl {
    private var remote: SpotifyAppRemote? = null
    @Volatile var connected = false; private set
    @Volatile private var connecting = false
    @Volatile var wantUri: String? = null; private set
    @Volatile private var wantPos = 0L
    @Volatile var wantPlaying = false; private set
    @Volatile private var last: PlayerState? = null
    @Volatile private var lastAt = 0L
    @Volatile private var lastErr = ""
    @Volatile private var maxPosOfWant = 0L
    @Volatile private var ended = false
    @Volatile private var wantDur = 0L
    private var backoff = 2000L
    private var appCtx: Context? = null
    private var watching = false
    private var lostSince = 0L
    private var nextTry = 0L
    private var attempt = 0
    @Volatile private var pendingSave: List<String> = emptyList()
    /** Josef 2.11.2026: "Spotify sollte regelmäßig von der App geweckt werden", Bildschirm aus, Handy frei nutzbar.
     *  Solange eine Show läuft (auch pausiert, auch zwischen den Songs), hält Inka die Verbindung zu Spotify offen
     *  und baut sie alle 30 s neu auf, wenn sie weg ist. Eine bestehende Verbindung hält den Spotify-Dienst wach. */
    @Volatile var keep = false; private set
    private var keeping = false

    fun keepAlive(ctx: Context, on: Boolean) {
        appCtx = ctx.applicationContext
        keep = on
        if (!on) return
        if (!connected && !connecting && System.currentTimeMillis() >= nextTry) connect(ctx)
        if (keeping) return; keeping = true
        val tick = object : Runnable {
            override fun run() {
                if (!keep) { keeping = false; return }
                val c = appCtx
                val r = remote
                if (r == null || !r.isConnected) {
                    if (connected) markLost()
                    if (c != null && !connecting && System.currentTimeMillis() >= nextTry) connect(c)
                } else {
                    // Lebenszeichen: Status abfragen, hält den Kanal offen und erkennt stille Abbrüche
                    r.playerApi.playerState.setResultCallback { if (remote === r) onState(it) }.setErrorCallback { if (remote === r) markLost() }
                }
                Hub.main.postDelayed(this, 30000)
            }
        }
        Hub.main.postDelayed(tick, 30000)
    }

    fun connect(ctx: Context) {
        appCtx = ctx.applicationContext
        if (connected || connecting) return
        val id = Prefs.clientId(ctx)
        if (id.isBlank()) { lastErr = "keine Client-ID"; emit("fehler"); return }
        if (!SpotifyAppRemote.isSpotifyInstalled(ctx)) { lastErr = "Spotify-App fehlt"; emit("fehler"); return }
        connecting = true
        val my = ++attempt
        Hub.main.postDelayed({ if (connecting && attempt == my) { connecting = false; lastErr = "Zeitüberschreitung"; markLost(); scheduleReconnect() } }, 60000)
        val params = ConnectionParams.Builder(id).setRedirectUri(Hub.REDIRECT).showAuthView(true).build()
        val c: Context = if (Hub.activity?.hasWindowFocus() == true) Hub.activity!! else ctx.applicationContext
        Hub.main.post {
            try {
                SpotifyAppRemote.connect(c, params, object : Connector.ConnectionListener {
                    override fun onConnected(r: SpotifyAppRemote) {
                        if (attempt != my) { try { SpotifyAppRemote.disconnect(r) } catch (_: Exception) {}; return }
                        remote?.let { if (it !== r) try { SpotifyAppRemote.disconnect(it) } catch (_: Exception) {} }
                        remote = r; connected = true; connecting = false; backoff = 2000L; nextTry = 0L; lastErr = ""; lostSince = 0L
                        r.playerApi.subscribeToPlayerState().setEventCallback { ps -> if (remote === r) onState(ps) }
                            .setErrorCallback { t -> if (remote === r) { lastErr = t.javaClass.simpleName; markLost() } }
                        emit("verbunden")
                        if (pendingSave.isNotEmpty()) { val l = pendingSave; pendingSave = emptyList(); doSave(l) }
                        if (wantPlaying && wantUri != null) ensurePlaying("nach Neuverbindung")
                    }
                    override fun onFailure(t: Throwable) {
                        if (attempt != my) return
                        connecting = false; lastErr = t.javaClass.simpleName + ": " + (t.message ?: "").take(80)
                        markLost(); scheduleReconnect()
                    }
                })
            } catch (e: Exception) { connecting = false; lastErr = e.javaClass.simpleName; markLost(); scheduleReconnect() }
        }
    }

    private fun markLost() {
        val was = connected
        connected = false; remote?.let { try { SpotifyAppRemote.disconnect(it) } catch (_: Exception) {} }; remote = null
        if (lostSince == 0L) lostSince = System.currentTimeMillis()
        emit(if (was) "verloren" else "fehler")
    }

    private fun scheduleReconnect() {
        if (!wantPlaying && !keep) return
        val d = backoff; backoff = (backoff * 2).coerceAtMost(30000L)
        nextTry = System.currentTimeMillis() + d
        Hub.main.postDelayed({ if (wantPlaying || keep) appCtx?.let { connect(it) } }, d)
    }

    /** Radio-Übergang (Josef 1.11./2.11.2026): Song startet unter Inkas letzten Worten leise und wird hochgeblendet.
     *  Inka nimmt dafür den Audiofokus "kurz, darf absenken"; Android senkt Spotify ab. Fokus abgeben = Spotify blendet hoch. */
    @Volatile var duckWanted = false

    fun duck(ctx: Context, on: Boolean) {
        appCtx = ctx.applicationContext
        duckWanted = on
        if (!on) { Duck.off(appCtx); return }
        val l = last
        if (l != null && l.track?.uri == wantUri && !l.isPaused) Duck.on(appCtx)
    }

    private fun onState(ps: PlayerState) {
        last = ps; lastAt = System.currentTimeMillis()
        if (duckWanted && !Duck.active && ps.track?.uri == wantUri && !ps.isPaused) Duck.on(appCtx)
        val uri = ps.track?.uri
        if (uri != null && uri == wantUri) {
            maxPosOfWant = maxOf(maxPosOfWant, ps.playbackPosition)
            val dur = ps.track?.duration ?: 0L
            if (dur > 0) wantDur = dur
            if (dur > 0 && ps.playbackPosition >= dur - 2500) ended = true
        } else if (wantUri != null && uri != null && wantDur > 0 && maxPosOfWant >= wantDur - 15000) {
            ended = true   // Spotify ist nach dem Ende von selbst zum nächsten Titel gesprungen
        }
        if (ended && wantPlaying) { wantPlaying = false; try { remote?.playerApi?.pause() } catch (_: Exception) {} }
        emit("status")
    }

    fun play(ctx: Context, uri: String, pos: Long) {
        appCtx = ctx.applicationContext
        wantUri = uri; wantPos = pos; wantPlaying = true; ended = false; maxPosOfWant = 0L; wantDur = 0L
        startWatch()
        if (!connected) { connect(ctx); return }
        doPlay(uri, pos)
    }

    private fun doPlay(uri: String, pos: Long) {
        val api = remote?.playerApi ?: return
        // Josef 2.11.2026: Einblenden wie im Radio. Spotify hat keine eigene Lautstärke für fremde Apps,
        // deshalb wird die Medienlautstärke kurz abgesenkt und in 4 s auf den alten Wert zurückgeführt (Inka schweigt in dem Moment).
        val fade = pos <= 1500 && !duckWanted
        if (fade) Fade.down(appCtx)
        api.play(uri).setResultCallback {
            if (pos > 1500) api.seekTo(pos)
            if (fade) Fade.up(appCtx)
        }.setErrorCallback { t -> if (fade) Fade.restore(appCtx); lastErr = "play: " + t.javaClass.simpleName; emit("fehler") }
    }

    private fun ensurePlaying(why: String) {
        val u = wantUri ?: return
        val l = last
        val pos = if (l?.track?.uri == u) l.playbackPosition else maxOf(wantPos, maxPosOfWant)
        Hub.log("Song wieder aufnehmen ($why) bei $pos ms")
        if (l?.track?.uri == u && l.isPaused) remote?.playerApi?.resume() else doPlay(u, pos)
        emit("wieder")
    }

    /**
     * Songs in "Lieblingssongs" speichern (Josef 1.11.2026): Spotify lässt kleine Apps keine Playlists mehr anlegen,
     * über die Spotify-App selbst geht das Merken. Danach in Spotify "Lieblingssongs" herunterladen, dann laufen sie offline.
     */
    fun saveToLibrary(ctx: Context, uris: List<String>) {
        appCtx = ctx.applicationContext
        if (uris.isEmpty()) return
        if (!connected) { pendingSave = uris; connect(ctx); return }
        doSave(uris)
    }

    private fun doSave(uris: List<String>) {
        val api = remote?.userApi ?: run { pendingSave = uris; return }
        var ok = 0; var bad = 0; var err = ""
        fun done() { if (ok + bad == uris.size) Hub.emit(JSONObject().put("type", "lib").put("saved", ok).put("failed", bad).put("err", err)) }
        uris.forEach { u ->
            try {
                api.addToLibrary(u).setResultCallback { ok++; done() }.setErrorCallback { t -> bad++; err = t.javaClass.simpleName; done() }
            } catch (e: Exception) { bad++; err = e.javaClass.simpleName; done() }
        }
    }

    fun pause() { wantPlaying = false; duckWanted = false; Duck.off(appCtx); try { remote?.playerApi?.pause() } catch (_: Exception) {} }
    fun resume(ctx: Context) { if (wantUri == null) return; wantPlaying = true; startWatch(); if (!connected) connect(ctx) else ensurePlaying("weiter") }
    fun stop() { wantPlaying = false; wantUri = null; ended = false; duckWanted = false; Duck.off(appCtx); try { remote?.playerApi?.pause() } catch (_: Exception) {} }

    /** Wächter: erkennt stumme Abbrüche (keine Statusmeldungen mehr, Spotify pausiert von selbst, anderer Song). */
    private fun startWatch() {
        if (watching) return; watching = true
        val tick = object : Runnable {
            override fun run() {
                if (!wantPlaying || wantUri == null) { watching = false; return }
                val ctx = appCtx
                val r = remote
                if (r == null || !r.isConnected) {
                    if (connected) { markLost(); scheduleReconnect() }
                    else if (ctx != null && !connecting && System.currentTimeMillis() >= nextTry) connect(ctx)
                }
                else {
                    val l = last
                    val stale = System.currentTimeMillis() - lastAt > 15000
                    val wrong = l?.track?.uri != null && l.track.uri != wantUri && !ended
                    val userPaused = l != null && l.track?.uri == wantUri && l.isPaused && !ended && System.currentTimeMillis() - lastAt > 3000
                    if (stale) { r.playerApi.playerState.setResultCallback { if (remote === r) onState(it) }.setErrorCallback { if (remote === r) markLost() } }
                    if (userPaused) {
                        // Pause über Kopfhörer, Auto oder Spotify selbst: als Nutzerpause werten, nicht eigenmächtig fortsetzen
                        wantPlaying = false; emit("pausiert"); watching = false; return
                    }
                    if (wrong) ensurePlaying("falscher Titel")
                }
                Hub.main.postDelayed(this, 4000)
            }
        }
        Hub.main.postDelayed(tick, 4000)
    }

    fun onNetwork(online: Boolean) {
        Hub.main.post { if (online && (wantPlaying || keep) && !connected && !connecting) appCtx?.let { backoff = 2000L; nextTry = 0L; connect(it) } }
    }

    fun stateJson(): JSONObject {
        val l = last
        val now = System.currentTimeMillis()
        var pos = l?.playbackPosition ?: 0L
        if (l != null && !l.isPaused && connected) pos += (now - lastAt).coerceAtMost(15000)
        return JSONObject().apply {
            put("type", "sp"); put("connected", connected); put("connecting", connecting)
            put("uri", l?.track?.uri ?: ""); put("name", l?.track?.name ?: ""); put("artist", l?.track?.artist?.name ?: "")
            put("pos", pos); put("dur", l?.track?.duration ?: 0L); put("paused", l?.isPaused ?: true)
            put("want", wantUri ?: ""); put("wantPlaying", wantPlaying); put("ended", ended); put("err", lastErr)
            put("lostMs", if (lostSince > 0 && !connected) now - lostSince else 0L)
        }
    }

    private fun emit(ev: String) { Hub.emit(stateJson().put("ev", ev)) }
}


/** Einblenden über die Medienlautstärke (Josef 2.11.2026). Stellt immer den Ausgangswert wieder her;
 *  dreht der Nutzer selbst am Lautstärkeregler, bricht das Einblenden ab und lässt seinen Wert stehen. */
object Fade {
    private var target = -1
    private var setTo = -1
    private var gen = 0

    private fun am(c: Context?) = c?.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager

    fun down(c: Context?) {
        val a = am(c) ?: return
        val cur = a.getStreamVolume(android.media.AudioManager.STREAM_MUSIC)
        if (target < 0) target = cur
        if (target <= 1) return
        setTo = maxOf(1, (target * 0.3).toInt())
        try { a.setStreamVolume(android.media.AudioManager.STREAM_MUSIC, setTo, 0) } catch (_: Exception) {}
        val my = ++gen
        Hub.main.postDelayed({ if (gen == my && target >= 0) up(c) }, 8000)   // Sicherheitsnetz, falls Spotify nicht antwortet
    }

    fun up(c: Context?) {
        val a = am(c) ?: return
        if (target < 0) return
        val t = target; val start = setTo.coerceAtLeast(1); val my = ++gen
        val steps = 16
        for (i in 1..steps) {
            Hub.main.postDelayed({
                if (gen != my) return@postDelayed
                val now = a.getStreamVolume(android.media.AudioManager.STREAM_MUSIC)
                if (setTo >= 0 && now != setTo) { target = -1; setTo = -1; return@postDelayed }   // Nutzer hat selbst geregelt
                val v = start + ((t - start) * i) / steps
                try { a.setStreamVolume(android.media.AudioManager.STREAM_MUSIC, v, 0) } catch (_: Exception) {}
                setTo = v
                if (i == steps) { target = -1; setTo = -1 }
            }, (i * 250).toLong())
        }
    }

    fun restore(c: Context?) {
        val a = am(c) ?: return
        if (target >= 0) try { a.setStreamVolume(android.media.AudioManager.STREAM_MUSIC, target, 0) } catch (_: Exception) {}
        target = -1; setTo = -1; gen++
    }
}


/** Audiofokus "kurz, darf absenken": Android senkt dabei andere Musik (Spotify) automatisch ab und blendet sie beim Abgeben wieder hoch. */
object Duck {
    @Volatile var active = false; private set
    private var req: android.media.AudioFocusRequest? = null

    fun on(c: Context?) {
        val a = c?.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager ?: return
        if (active) return
        try {
            val attrs = android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
            val r = android.media.AudioFocusRequest.Builder(android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attrs).setOnAudioFocusChangeListener { }.build()
            if (a.requestAudioFocus(r) == android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { req = r; active = true; Hub.log("Radio: Spotify abgesenkt") }
        } catch (e: Exception) { Hub.log("Absenken nicht möglich: " + e.javaClass.simpleName) }
        // Sicherheitsnetz: nie länger als 20 s absenken
        Hub.main.postDelayed({ if (active) off(c) }, 20000)
    }

    fun off(c: Context?) {
        val a = c?.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
        val r = req; req = null
        if (r != null && a != null) try { a.abandonAudioFocusRequest(r) } catch (_: Exception) {}
        if (active) Hub.log("Radio: Spotify hochgeblendet")
        active = false
    }
}
