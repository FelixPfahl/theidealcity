package gg.theidealcity.inka

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.PlaybackParams
import android.media.audiofx.Equalizer
import android.media.audiofx.LoudnessEnhancer
import android.os.PowerManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Inkas Stimme über Androids eigenen Player (Josef 2.11.2026: echte Überblendung wie im Radio).
 * Die WebView hielt Inka an, sobald Spotify loslegte. Dieser Player ignoriert das während des Vorlaufs.
 * Außerdem fährt er die Songwechsel selbst: kurz vor einer Songstelle startet er Spotify leise unter Inka,
 * an der Songstelle hält er Inka an, nach dem Song spricht Inka weiter. Das klappt auch, wenn die Seite im Hintergrund schläft.
 */
object Voice {
    private var mp: MediaPlayer? = null
    private var ctx: Context? = null
    @Volatile var ready = false; private set
    @Volatile private var durMs = 0
    @Volatile private var loadedId = ""
    private var vol = 0.4f
    private var loud: LoudnessEnhancer? = null
    /** Josef 2.11.2026 18:07/18:08: "Stimmen viel leiser als die Musik, sollte gleich laut sein", Musik kommt lossless (ohne Lautheitsangleich, etwa -9 LUFS).
     *  Die Sprache liegt bei etwa -20 LUFS. Grundverstärkung +10 dB beim Regler 40 %, der Regler verschiebt das (Begrenzer verhindert Übersteuern). */
    private const val BASE_DB = 10.0
    private var rate = 1f
    private var eq: Equalizer? = null
    private var eqBass = 0; private var eqTreble = 0

    // Songstellen: Zeit in ms, Kapitel, Spotify-URI
    private data class Stop(val k: Int, val t: Long, val uri: String, val pre: Long)
    private var stops: List<Stop> = emptyList()
    private var preOn = true
    private const val PRE_MS = 6500L
    @Volatile var pre = false; private set          // Vorlauf läuft: Fokusverlust ignorieren
    @Volatile private var activeK = -1               // Song, den die App selbst gestartet hat
    @Volatile private var activeUri = ""
    private var activeAt = 0L
    private var lastPos = 0L
    private var ticking = false

    // Audiofokus
    private var focusReq: AudioFocusRequest? = null
    private var resumeOnGain = false
    private var ducked = false
    private var waitQuietSince = 0L

    private fun am() = ctx?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

    private fun emit(ev: String, extra: JSONObject = JSONObject()) {
        extra.put("type", "voice").put("ev", ev).put("pos", pos()).put("playing", playing()).put("dur", durMs)
        Hub.emit(extra)
    }

    fun pos(): Long = try { if (ready) mp?.currentPosition?.toLong() ?: 0L else 0L } catch (_: Exception) { 0L }
    fun playing(): Boolean = try { ready && mp?.isPlaying == true } catch (_: Exception) { false }
    fun state(): JSONObject = JSONObject().put("pos", pos()).put("playing", playing()).put("ready", ready).put("dur", durMs).put("id", loadedId)
        .put("pre", pre).put("activeK", activeK)

    /** Show laden: verschlüsselte .bin aus dem Speicher (oder Netz), entschlüsseln, in den Player. */
    fun load(c: Context, id: String, t: String) {
        ctx = c.applicationContext
        if (loadedId == "$id.$t" && ready) { emit("ready"); return }
        Thread {
            try {
                val f = decrypted(c, id, t)
                Hub.main.post { prepare(f, "$id.$t") }
            } catch (e: Exception) {
                Hub.log("Stimme laden: " + e.javaClass.simpleName)
                Hub.main.post { emit("error", JSONObject().put("err", e.javaClass.simpleName + ": " + (e.message ?: "").take(60))) }
            }
        }.start()
    }

    private fun decrypted(c: Context, id: String, t: String): File {
        val dir = File(c.filesDir, "voice").apply { mkdirs() }
        val out = File(dir, "$id.$t.m4a")
        if (out.exists() && out.length() > 1000) return out
        val off = OfflineStore.dir(c)
        val exact = File(off, "$id.bin.$t")
        val enc: ByteArray = if (exact.exists()) exact.readBytes() else {
            val con = URL(Hub.RAW + "d/$id.bin?t=$t").openConnection() as HttpURLConnection
            con.connectTimeout = 15000; con.readTimeout = 90000
            if (con.responseCode != 200) throw IllegalStateException("Audio " + con.responseCode)
            val b = con.inputStream.use { it.readBytes() }
            off.listFiles { x -> x.name.startsWith("$id.bin.") }?.forEach { it.delete() }
            File(off, "$id.bin.$t.tmp").apply { writeBytes(b); renameTo(exact) }
            b
        }
        val key = Prefs.key(c); if (key.isBlank()) throw IllegalStateException("kein Schlüssel")
        val k = android.util.Base64.decode(key, android.util.Base64.URL_SAFE or android.util.Base64.NO_WRAP or android.util.Base64.NO_PADDING)
        val ci = Cipher.getInstance("AES/GCM/NoPadding")
        ci.init(Cipher.DECRYPT_MODE, SecretKeySpec(k, "AES"), GCMParameterSpec(128, enc.copyOfRange(0, 12)))
        val audio = ci.doFinal(enc, 12, enc.size - 12)
        dir.listFiles { x -> x.name.startsWith("$id.") && x.name != out.name }?.forEach { it.delete() }
        // ältere Shows wegräumen (nur die letzten 4 behalten)
        dir.listFiles()?.sortedByDescending { it.lastModified() }?.drop(4)?.forEach { it.delete() }
        File(out.path + ".tmp").apply { writeBytes(audio); renameTo(out) }
        return out
    }

    private fun prepare(f: File, tag: String) {
        release()
        val p = MediaPlayer()
        mp = p; loadedId = tag
        try {
            p.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
            ctx?.let { p.setWakeMode(it, PowerManager.PARTIAL_WAKE_LOCK) }
            p.setDataSource(f.path)
            p.setOnPreparedListener {
                ready = true; durMs = it.duration; applyVolume(); applyEq()
                emit("ready")
            }
            p.setOnCompletionListener { stopTick(); abandon(); emit("ended") }
            p.setOnErrorListener { _, what, extra -> emit("error", JSONObject().put("err", "MediaPlayer $what/$extra")); true }
            p.prepareAsync()
        } catch (e: Exception) { emit("error", JSONObject().put("err", e.javaClass.simpleName)) }
    }

    fun release() {
        stopTick(); abandon()
        try { eq?.release() } catch (_: Exception) {}; eq = null
        try { loud?.release() } catch (_: Exception) {}; loud = null
        try { mp?.release() } catch (_: Exception) {}
        mp = null; ready = false; durMs = 0; loadedId = ""; pre = false; activeK = -1
    }

    /** Aufruf der Seite (oder der App selbst nach einem Song). byPage: ausdrücklicher Wunsch, beendet jedes automatische Weiterspielen. */
    fun play(byPage: Boolean = true) {
        val p = mp ?: return; if (!ready) return
        if (byPage) { resumeOnGain = false; waitQuietSince = 0L }
        if (!pre) requestFocus()
        try {
            p.start()
            if (rate != 1f) try { p.playbackParams = PlaybackParams().setSpeed(rate).setPitch(1f) } catch (_: Exception) {}
        } catch (_: Exception) {}
        lastPos = pos(); startTick(); emit("play")
    }

    fun pause(byPage: Boolean = true, why: String = "") {
        val p = mp ?: return
        // 9.11.2026: Die Seite hält Inka an der Songstelle oft ein paar Millisekunden vor dem eigenen Takt an.
        // Läuft gerade der Vorlauf und ist die Songstelle erreicht, Song jetzt hochblenden (sonst blieb er bis zum Sicherheitsnetz leise).
        if (pre && activeK >= 0) {
            val st = stops.firstOrNull { it.k == activeK }
            if (st != null && pos() >= st.t - 400) { pre = false; ctx?.let { SpotifyCtl.duck(it, false) }; Hub.diag("n-songstelle-seite", JSONObject().put("k", activeK)) }
        }
        if (byPage) { resumeOnGain = false; waitQuietSince = 0L }
        try { if (p.isPlaying) p.pause() } catch (_: Exception) {}
        stopTick()
        if (byPage) abandon()
        emit("pause", JSONObject().put("why", why))
    }

    fun seek(ms: Long) {
        val p = mp ?: return; if (!ready) return
        try { p.seekTo(ms.coerceIn(0L, durMs.toLong()), MediaPlayer.SEEK_CLOSEST) } catch (_: Exception) { try { p.seekTo(ms.toInt()) } catch (_: Exception) {} }
        lastPos = ms
        if (pre) { pre = false }   // Sprung im Vorlauf: Vorlauf vorbei, die Seite regelt den Song
        emit("seek")
    }

    fun setVolume(v: Float) { vol = v.coerceIn(0f, 1f); applyVolume() }

    private fun applyVolume() {
        val p = mp ?: return; if (!ready) return
        val db = if (vol <= 0.001f) -60.0 else (BASE_DB + 20.0 * Math.log10(vol / 0.4)).coerceIn(-40.0, 16.0)
        val duck = if (ducked) 0.3f else 1f
        try {
            if (db > 0) {
                p.setVolume(duck, duck)
                val l = loud ?: LoudnessEnhancer(p.audioSessionId).also { loud = it }
                l.setTargetGain((db * 100).toInt()); l.enabled = true
            } else {
                loud?.enabled = false
                val g = (Math.pow(10.0, db / 20.0)).toFloat() * duck
                p.setVolume(g, g)
            }
        } catch (e: Exception) { Hub.log("Lautstärke: " + e.javaClass.simpleName); try { p.setVolume(duck, duck) } catch (_: Exception) {} }
    }

    fun setRate(r: Float) {
        rate = r.coerceIn(0.5f, 2f)
        val p = mp ?: return
        if (playing()) try { p.playbackParams = PlaybackParams().setSpeed(rate).setPitch(1f) } catch (_: Exception) {}
    }

    fun setEq(bass: Int, treble: Int) { eqBass = bass; eqTreble = treble; applyEq() }

    private fun applyEq() {
        val p = mp ?: return; if (!ready) return
        try {
            if (eqBass == 0 && eqTreble == 0) { eq?.enabled = false; return }
            val e = eq ?: Equalizer(0, p.audioSessionId).also { eq = it }
            val range = e.bandLevelRange   // Millibel
            for (b in 0 until e.numberOfBands) {
                val hz = e.getCenterFreq(b.toShort()) / 1000
                val db = when { hz <= 300 -> eqBass; hz >= 3000 -> eqTreble; hz <= 800 -> eqBass / 2; hz >= 1500 -> eqTreble / 2; else -> 0 }
                e.setBandLevel(b.toShort(), (db * 100).coerceIn(range[0].toInt(), range[1].toInt()).toShort())
            }
            e.enabled = true
        } catch (ex: Exception) { Hub.log("EQ: " + ex.javaClass.simpleName) }
    }

    /** Songstellen von der Seite: [{k, t (s), uri}], preOn = Radio-Vorlauf an. */
    fun setStops(json: String, preOn: Boolean) {
        this.preOn = preOn
        stops = try {
            val a = JSONArray(json); (0 until a.length()).map { val o = a.getJSONObject(it); Stop(o.getInt("k"), (o.getDouble("t") * 1000).toLong(), o.getString("uri"), (o.optDouble("pre", 6.5) * 1000).toLong().coerceIn(3000L, 20000L)) }
        } catch (_: Exception) { emptyList() }
    }

    // ---------- Songwechsel ----------
    private val tick = object : Runnable {
        override fun run() {
            if (!ticking) return
            val now = pos()
            if (playing()) check(lastPos, now)
            lastPos = now
            Hub.main.postDelayed(this, 100)
        }
    }
    private fun startTick() { if (ticking) return; ticking = true; Hub.main.postDelayed(tick, 100) }
    private fun stopTick() { ticking = false; Hub.main.removeCallbacks(tick) }

    private fun spotifyOk(): Boolean = ctx?.let { Prefs.clientId(it).isNotBlank() } == true

    private fun check(prev: Long, now: Long) {
        if (now < prev || now - prev > 2500) return   // Sprung, kein Durchlaufen
        for (s in stops) {
            // Vorlauf: Spotify startet leise unter Inkas letzten Worten
            val pt = s.t - s.pre
            if (preOn && spotifyOk() && activeK < 0 && prev < pt && now >= pt) {
                val c = ctx ?: return
                pre = true; activeK = s.k; activeUri = s.uri; activeAt = System.currentTimeMillis()
                SpotifyCtl.duck(c, true, (s.pre / rate.coerceAtLeast(0.5f)).toLong() + 6000L); SpotifyCtl.play(c, s.uri, 0L)
                Hub.diag("n-vorlauf", JSONObject().put("k", s.k).put("vorlauf_s", s.pre / 1000.0).put("tempo", rate.toDouble()).put("echt_s", s.pre / 1000.0 / rate))
                emit("song-pre", JSONObject().put("k", s.k).put("uri", s.uri))
            }
            // Songstelle: Inka hält an, Song voll
            if (prev < s.t && now >= s.t) {
                val c = ctx ?: return
                try { mp?.pause() } catch (_: Exception) {}
                stopTick()
                val wasPre = activeK == s.k && (pre || SpotifyCtl.duckWanted)   // vor dem Sprung bestimmen: seek() beendet den Vorlauf (2.11.2026: Song lief sonst doppelt)
                pre = false
                seek(s.t + 1020)
                if (wasPre) SpotifyCtl.duck(c, false)
                else if (spotifyOk()) { activeK = s.k; activeUri = s.uri; activeAt = System.currentTimeMillis(); SpotifyCtl.play(c, s.uri, 0L) }
                else { emit("song-skip", JSONObject().put("k", s.k)); play(false); return }
                if (activeK >= 0) { activeAt = System.currentTimeMillis(); Hub.main.postDelayed({ watchdog() }, 31000) }
                emit("song-stop", JSONObject().put("k", s.k).put("uri", s.uri).put("pre", wasPre))
                return
            }
        }
    }

    /** SpotifyCtl meldet: Song zu Ende (oder fremder Titel, gesperrt). Läuft der Song von hier, spricht Inka weiter. */
    fun onSongEnded(uri: String?, why: String) {
        if (activeK < 0 || uri != activeUri) return
        val k = activeK; activeK = -1; activeUri = ""
        if (pre) { pre = false; return }   // Vorlauf abgebrochen: Inka spricht ja noch
        Hub.diag("n-inka-weiter", JSONObject().put("k", k).put("why", why))
        play(false)
        emit("song-resume", JSONObject().put("k", k).put("why", why))
    }

    /** Die Seite hat den Song übernommen oder beendet (Stop, Sprung, Pause). */
    fun onSongCleared() { if (activeK >= 0 && !pre) { activeK = -1; activeUri = "" } }

    /** Wächter: kommt Spotify an einer Songstelle nicht in Gang, nach 30 s still ohne Song weiter (Josef 8.11.2026, U19). */
    fun watchdog() {
        if (activeK >= 0 && !pre && !playing() && System.currentTimeMillis() - activeAt > 30000 && !SpotifyCtl.isWantPlaying()) {
            val k = activeK; activeK = -1; activeUri = ""
            Hub.diag("n-song-ohne-spotify", JSONObject().put("k", k))
            play(false); emit("song-resume", JSONObject().put("k", k).put("why", "spotify-fehlt"))
        }
    }

    // ---------- Audiofokus ----------
    private val focusListener = AudioManager.OnAudioFocusChangeListener { f ->
        Hub.main.post {
            when (f) {
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> if (!pre) { ducked = true; applyVolume() }
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT, AudioManager.AUDIOFOCUS_LOSS -> {
                    if (pre || activeK >= 0) return@post   // Spotify unter Inka (Vorlauf) oder Song läuft: kein Grund anzuhalten
                    if (playing()) {
                        try { mp?.pause() } catch (_: Exception) {}
                        stopTick(); resumeOnGain = true; waitQuietSince = System.currentTimeMillis()
                        Hub.diag("n-fremdpause", JSONObject().put("kurz", f == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT))
                        emit("pause", JSONObject().put("why", "fokus"))
                        if (f == AudioManager.AUDIOFOCUS_LOSS) waitQuiet()
                    }
                }
                AudioManager.AUDIOFOCUS_GAIN -> {
                    if (ducked) { ducked = false; applyVolume() }
                    if (resumeOnGain) { resumeOnGain = false; play(false); Hub.diag("n-fremdpause-weiter", JSONObject()) }
                }
            }
        }
    }

    /** Nach dauerhaftem Fokusverlust: warten, bis keine andere App mehr Ton macht, dann weiter (höchstens 30 min). */
    private fun waitQuiet() {
        var quiet = 0
        val r = object : Runnable {
            override fun run() {
                if (!resumeOnGain || playing()) return
                if (System.currentTimeMillis() - waitQuietSince > 30 * 60000) { resumeOnGain = false; return }
                val busy = try { am()?.isMusicActive == true } catch (_: Exception) { false }
                if (busy) quiet = 0 else quiet++
                if (quiet >= 2) { resumeOnGain = false; play(false); Hub.diag("n-fremdpause-weiter", JSONObject().put("lang", true)); return }
                Hub.main.postDelayed(this, 1500)
            }
        }
        Hub.main.postDelayed(r, 1500)
    }

    private fun requestFocus() {
        val a = am() ?: return
        abandon()
        try {
            val r = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                .setOnAudioFocusChangeListener(focusListener, Hub.main).setWillPauseWhenDucked(false).build()
            if (a.requestAudioFocus(r) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) focusReq = r
        } catch (_: Exception) {}
    }

    private fun abandon() {
        val r = focusReq ?: return; focusReq = null
        try { am()?.abandonAudioFocusRequest(r) } catch (_: Exception) {}
    }
}
