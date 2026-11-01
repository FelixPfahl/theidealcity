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

    fun connect(ctx: Context) {
        appCtx = ctx.applicationContext
        if (connected || connecting) return
        val id = Prefs.clientId(ctx)
        if (id.isBlank()) { lastErr = "keine Client-ID"; emit("fehler"); return }
        if (!SpotifyAppRemote.isSpotifyInstalled(ctx)) { lastErr = "Spotify-App fehlt"; emit("fehler"); return }
        connecting = true
        val my = ++attempt
        Hub.main.postDelayed({ if (connecting && attempt == my) { connecting = false; lastErr = "Zeitüberschreitung"; markLost(); scheduleReconnect() } }, 20000)
        val params = ConnectionParams.Builder(id).setRedirectUri(Hub.REDIRECT).showAuthView(true).build()
        val c: Context = Hub.activity ?: ctx.applicationContext
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
        if (!wantPlaying) return
        val d = backoff; backoff = (backoff * 2).coerceAtMost(30000L)
        nextTry = System.currentTimeMillis() + d
        Hub.main.postDelayed({ if (wantPlaying) appCtx?.let { connect(it) } }, d)
    }

    private fun onState(ps: PlayerState) {
        last = ps; lastAt = System.currentTimeMillis()
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
        api.play(uri).setResultCallback {
            if (pos > 1500) api.seekTo(pos)
        }.setErrorCallback { t -> lastErr = "play: " + t.javaClass.simpleName; emit("fehler") }
    }

    private fun ensurePlaying(why: String) {
        val u = wantUri ?: return
        val l = last
        val pos = if (l?.track?.uri == u) l.playbackPosition else maxOf(wantPos, maxPosOfWant)
        Hub.log("Song wieder aufnehmen ($why) bei $pos ms")
        if (l?.track?.uri == u && l.isPaused) remote?.playerApi?.resume() else doPlay(u, pos)
        emit("wieder")
    }

    fun pause() { wantPlaying = false; try { remote?.playerApi?.pause() } catch (_: Exception) {} }
    fun resume(ctx: Context) { if (wantUri == null) return; wantPlaying = true; startWatch(); if (!connected) connect(ctx) else ensurePlaying("weiter") }
    fun stop() { wantPlaying = false; wantUri = null; ended = false; try { remote?.playerApi?.pause() } catch (_: Exception) {} }

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
        Hub.main.post { if (online && wantPlaying && !connected && !connecting) appCtx?.let { backoff = 2000L; nextTry = 0L; connect(it) } }
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
