package gg.theidealcity.inka

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import org.json.JSONObject

/**
 * Radio-Übergang über die Medienlautstärke (Josef 9.11.2026, Fragebogen UEBERGANG, alle Empfehlungen).
 *
 * Androids Absenken (Audiofokus "darf absenken") wirkt auf Josefs Handy nicht auf Spotify. Der einzige Regler,
 * der sicher greift, ist die Medienlautstärke. Sie gilt aber auch für Inka. Deshalb:
 *  - Vorlauf: Medienlautstärke auf "Teppich" (Standard -12 dB unter Josefs Einstellung) senken und Inkas Stimme
 *    im selben Maß lauter machen (LoudnessEnhancer), so dass Inka gleich laut bleibt und nur der Song leise ist.
 *    Der Song setzt dabei 6 dB unter dem Teppich ein und kommt in 2 s auf Teppich-Lautstärke.
 *  - Songstelle (Inkas letztes Wort): Ausgleich weg (Inka schweigt), Medienlautstärke in 3 s auf Josefs Wert zurück.
 *  - Dreht Josef selbst an der Lautstärke, gilt seine Einstellung und der Übergang hört sofort auf.
 */
object Bed {
    @Volatile var active = false; private set
    private var ctx: Context? = null
    private var orig = -1          // Josefs Medienlautstärke vor dem Übergang
    private var origDb = 0f
    private var setTo = -1         // zuletzt von uns gesetzter Wert (Abweichung = Josef hat gedreht)
    private var gen = 0
    private var startedAt = 0L
    private var useCurve = true    // false: Gerät meldet eine flache Kurve (Bluetooth mit absoluter Lautstärke), dann angenähert

    fun bedDb(c: Context): Int = c.getSharedPreferences("inka", Context.MODE_PRIVATE).getInt("bed_db", -12)
    fun setBedDb(c: Context, db: Int) { c.getSharedPreferences("inka", Context.MODE_PRIVATE).edit().putInt("bed_db", db.coerceIn(-24, -4)).apply() }

    private fun am(c: Context?) = c?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

    /** Gerätetyp der aktuellen Ausgabe, für die Lautstärkekurve. */
    private fun device(a: AudioManager): Int {
        return try {
            val outs = a.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            when {
                outs.any { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP } -> AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
                outs.any { it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES || it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET } -> AudioDeviceInfo.TYPE_WIRED_HEADPHONES
                outs.any { it.type == AudioDeviceInfo.TYPE_USB_HEADSET } -> AudioDeviceInfo.TYPE_USB_HEADSET
                else -> AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
            }
        } catch (_: Exception) { AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
    }

    /** Pegel einer Lautstärkestufe in dB (0 dB = volle Lautstärke). Ab Android 9 aus der echten Kurve, sonst angenähert. */
    private fun dbAt(a: AudioManager, idx: Int, dev: Int): Float {
        val max = a.getStreamMaxVolume(AudioManager.STREAM_MUSIC).coerceAtLeast(1)
        if (idx <= 0) return -96f
        if (useCurve && Build.VERSION.SDK_INT >= 28) {
            try {
                val v = a.getStreamVolumeDb(AudioManager.STREAM_MUSIC, idx, dev)
                if (!v.isNaN() && !v.isInfinite() && v > -120f) return v
            } catch (_: Exception) {}
        }
        return (idx - max) * (50f / max)
    }

    /** Höchste Stufe, deren Pegel höchstens targetDb ist (mindestens 1). */
    private fun idxFor(a: AudioManager, targetDb: Float, dev: Int, top: Int): Int {
        var best = 1
        for (i in 1..top) if (dbAt(a, i, dev) <= targetDb + 0.5f) best = i
        return best
    }

    /** Vorlauf beginnt. maxMs: Sicherheitsnetz in echter Zeit (Vorlauf geteilt durch Sprechtempo plus Reserve). */
    fun start(c: Context, maxMs: Long) {
        val a = am(c) ?: return
        ctx = c.applicationContext
        if (active) abort(false, "neu")
        val cur = a.getStreamVolume(AudioManager.STREAM_MUSIC)
        if (cur <= 1) { Hub.diag("n-teppich", JSONObject().put("ok", false).put("grund", "lautstärke schon ganz unten")); return }
        val dev = device(a)
        // Bluetooth mit absoluter Lautstärke: Android meldet oft für alle Stufen 0 dB, weil erst die Box absenkt.
        // Dann taugt die Kurve nicht; angenähert mit etwa 50 dB über den ganzen Regelbereich.
        useCurve = true
        val span = dbAt(a, cur, dev) - dbAt(a, 1, dev)
        if (span < 10f) useCurve = false
        orig = cur; origDb = dbAt(a, cur, dev)
        val bed = bedDb(c)
        val bedIdx = idxFor(a, origDb + bed, dev, cur - 1)
        val lowIdx = idxFor(a, origDb + bed - 6, dev, bedIdx)
        active = true; startedAt = System.currentTimeMillis()
        val my = ++gen
        set(a, lowIdx, dev)
        Hub.diag("n-teppich", JSONObject().put("ok", true).put("von", cur).put("teppich", bedIdx).put("start", lowIdx)
            .put("db", (dbAt(a, bedIdx, dev) - origDb).toDouble()).put("geraet", dev).put("kurve", useCurve).put("max", a.getStreamMaxVolume(AudioManager.STREAM_MUSIC)))
        // in 2 s vom Einsatz auf Teppich-Lautstärke
        val steps = (bedIdx - lowIdx).coerceAtLeast(0)
        for (i in 1..steps) {
            Hub.main.postDelayed({
                if (gen != my || !active) return@postDelayed
                if (userTouched(a)) { abort(true, "nutzer"); return@postDelayed }
                set(a, lowIdx + i, dev)
            }, 2000L * i / steps)
        }
        Hub.main.postDelayed({ if (gen == my && active) release(c, "zeit") }, maxMs.coerceIn(6000L, 45000L))
        // Wächter: Josef dreht selbst an der Lautstärke
        val watch = object : Runnable {
            override fun run() {
                if (gen != my || !active) return
                if (userTouched(a)) { abort(true, "nutzer"); return }
                Hub.main.postDelayed(this, 300)
            }
        }
        Hub.main.postDelayed(watch, 300)
    }

    private fun userTouched(a: AudioManager): Boolean = try { setTo >= 0 && a.getStreamVolume(AudioManager.STREAM_MUSIC) != setTo } catch (_: Exception) { false }

    private fun set(a: AudioManager, idx: Int, dev: Int) {
        try { a.setStreamVolume(AudioManager.STREAM_MUSIC, idx, 0) } catch (_: Exception) {}
        setTo = idx
        // Mit eigenem Sprachkanal trifft die Medienlautstärke nur Spotify: kein Ausgleich nötig
        Voice.setComp(if (Voice.ownChannel()) 0f else (origDb - dbAt(a, idx, dev)).coerceIn(0f, 24f))
    }

    /** Songstelle: Inka schweigt, Song in 3 s auf Josefs Lautstärke. */
    fun release(c: Context?, why: String = "songstelle") {
        if (!active) return
        val a = am(c ?: ctx) ?: run { active = false; Voice.setComp(0f); return }
        val my = ++gen
        Voice.setComp(0f)
        val from = setTo.coerceAtLeast(1); val to = orig
        if (userTouched(a)) { active = false; Hub.diag("n-teppich-ende", JSONObject().put("grund", "nutzer")); return }
        val steps = (to - from).coerceAtLeast(0)
        if (steps == 0) { active = false; return }
        for (i in 1..steps) {
            Hub.main.postDelayed({
                if (gen != my) return@postDelayed
                if (userTouched(a)) { active = false; Hub.diag("n-teppich-ende", JSONObject().put("grund", "nutzer")); return@postDelayed }
                try { a.setStreamVolume(AudioManager.STREAM_MUSIC, from + i, 0) } catch (_: Exception) {}
                setTo = from + i
                if (i == steps) { active = false; setTo = -1 }
            }, 3000L * i / steps)
        }
        Hub.diag("n-teppich-ende", JSONObject().put("grund", why).put("s", (System.currentTimeMillis() - startedAt) / 1000.0))
    }

    /** Abbruch. userChanged: Josefs Einstellung gilt, nichts zurückstellen; sonst sofort auf Josefs Wert. */
    fun abort(userChanged: Boolean, why: String) {
        if (!active) return
        gen++; active = false
        Voice.setComp(0f)
        if (!userChanged) am(ctx)?.let { a -> try { if (orig > 0) a.setStreamVolume(AudioManager.STREAM_MUSIC, orig, 0) } catch (_: Exception) {} }
        setTo = -1
        Hub.diag("n-teppich-ende", JSONObject().put("grund", why))
    }
}
