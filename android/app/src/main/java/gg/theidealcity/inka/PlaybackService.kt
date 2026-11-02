package gg.theidealcity.inka

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.media.AudioManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.media.app.NotificationCompat.MediaStyle
import org.json.JSONObject

/**
 * Hintergrunddienst während der Show (Josef 1.11.2026):
 * hält App und Netz wach, Medien-Steuerung auf dem Sperrbildschirm, pausiert bei getrennter Bluetooth-Box,
 * meldet Netz-Ausfall und -Rückkehr und stößt das Neuverbinden mit Spotify an.
 */
class PlaybackService : Service() {
    companion object {
        const val CH = "inka_show"
        const val ID = 41

        @Volatile var running: PlaybackService? = null

        fun update(c: Context, title: String, sub: String, state: String) {
            SpotifyCtl.keepAlive(c, state != "stop")
            if (state == "stop") { c.stopService(Intent(c, PlaybackService::class.java)); return }
            // Läuft der Dienst schon, direkt aktualisieren: ein erneuter Start aus dem Hintergrund ist ab Android 12 verboten
            running?.let { it.apply(title, sub, state); return }
            val i = Intent(c, PlaybackService::class.java).putExtra("title", title).putExtra("sub", sub).putExtra("state", state)
            try { ContextCompat.startForegroundService(c, i) } catch (e: Exception) { Hub.log("Dienst-Start nicht erlaubt: " + e.javaClass.simpleName) }
        }
    }

    private lateinit var session: MediaSessionCompat
    private var wake: PowerManager.WakeLock? = null
    private var wifi: WifiManager.WifiLock? = null
    private var netCb: ConnectivityManager.NetworkCallback? = null
    private var title = "Inka"; private var sub = ""; private var state = "playing"

    private val noisy = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            if (i.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) {
                Hub.log("Bluetooth/Kopfhörer getrennt: Pause")
                Hub.js("window.appPause&&appPause('bluetooth')")
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        running = this
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CH, "Show", NotificationManager.IMPORTANCE_LOW).apply { setShowBadge(false) })
        session = MediaSessionCompat(this, "Inka").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() { Hub.js("window.appResume&&appResume()") }
                override fun onPause() { Hub.js("window.appPause&&appPause('sperrbild')") }
                override fun onSkipToNext() { Hub.js("window.nextCh&&nextCh()") }
                override fun onSkipToPrevious() { Hub.js("window.prevCh&&prevCh()") }
                override fun onStop() { Hub.js("window.appPause&&appPause('stop')") }
            })
            isActive = true
        }
        ContextCompat.registerReceiver(this, noisy, IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY), ContextCompat.RECEIVER_NOT_EXPORTED)
        val cm = getSystemService(ConnectivityManager::class.java)
        netCb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(n: Network) {
                Hub.emit(JSONObject().put("type", "net").put("online", true))
                SpotifyCtl.onNetwork(true)
            }
            override fun onLost(n: Network) { Hub.emit(JSONObject().put("type", "net").put("online", false)) }
        }
        try { cm.registerDefaultNetworkCallback(netCb!!) } catch (_: Exception) {}
        val pm = getSystemService(PowerManager::class.java)
        wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "inka:show").apply { setReferenceCounted(false) }
        val wm = applicationContext.getSystemService(WifiManager::class.java)
        @Suppress("DEPRECATION")
        wifi = wm.createWifiLock(if (Build.VERSION.SDK_INT >= 29) WifiManager.WIFI_MODE_FULL_LOW_LATENCY else WifiManager.WIFI_MODE_FULL_HIGH_PERF, "inka:wifi").apply { setReferenceCounted(false) }
    }

    fun apply(t: String, s: String, st: String) {
        Hub.main.post {
            title = t; sub = s; state = st
            locks()
            try { getSystemService(NotificationManager::class.java).notify(ID, build()) } catch (_: Exception) {}
        }
    }

    /** Mikrofon-Typ nur, wenn die Erlaubnis da ist (Gespräch mit Inka nach der Show, auch bei gesperrtem Bildschirm). */
    private fun fgType(): Int {
        var t = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
        if (Build.VERSION.SDK_INT >= 30 && ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED)
            t = t or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
        return t
    }

    private fun fg(n: Notification) {
        try { if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, fgType()) else startForeground(ID, n) }
        catch (e: Exception) { if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK) else startForeground(ID, n) }
    }

    private fun locks() {
        if (state == "playing" || state == "waiting") { wake?.acquire(3 * 3600 * 1000L); wifi?.acquire() }
        else { if (wake?.isHeld == true) wake?.release(); if (wifi?.isHeld == true) wifi?.release() }
    }

    override fun onStartCommand(i: Intent?, flags: Int, startId: Int): Int {
        if (i?.action == Intent.ACTION_MEDIA_BUTTON) {
            fg(build())
            // Medientaste nach der Show oder ohne Seite: nichts neu starten, Dienst beenden (Fund 7)
            if (Hub.web == null || state == "stop") { stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(); return START_NOT_STICKY }
            androidx.media.session.MediaButtonReceiver.handleIntent(session, i)
            return START_NOT_STICKY
        }
        title = i?.getStringExtra("title") ?: title
        sub = i?.getStringExtra("sub") ?: sub
        state = i?.getStringExtra("state") ?: state
        fg(build())
        // wach halten, solange die Show läuft oder auf Spotify/Netz wartet (bis 3 Stunden), bei Pause loslassen
        locks()
        return START_NOT_STICKY
    }

    private fun build(): Notification {
        val playing = state == "playing" || state == "waiting"
        session.setMetadata(MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, sub)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Inka").build())
        session.setPlaybackState(PlaybackStateCompat.Builder()
            .setActions(PlaybackStateCompat.ACTION_PLAY or PlaybackStateCompat.ACTION_PAUSE or PlaybackStateCompat.ACTION_PLAY_PAUSE or
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT or PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or PlaybackStateCompat.ACTION_STOP)
            .setState(if (playing) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1f)
            .build())
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        fun act(icon: Int, label: String, a: Long) = NotificationCompat.Action(icon, label,
            androidx.media.session.MediaButtonReceiver.buildMediaButtonPendingIntent(this, a))
        return NotificationCompat.Builder(this, CH)
            .setSmallIcon(R.drawable.ic_stat_inka)
            .setContentTitle(title).setContentText(sub).setContentIntent(open)
            .setOngoing(true).setSilent(true).setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(act(android.R.drawable.ic_media_previous, "Zurück", PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS))
            .addAction(if (playing) act(android.R.drawable.ic_media_pause, "Pause", PlaybackStateCompat.ACTION_PAUSE)
                       else act(android.R.drawable.ic_media_play, "Weiter", PlaybackStateCompat.ACTION_PLAY))
            .addAction(act(android.R.drawable.ic_media_next, "Nächstes", PlaybackStateCompat.ACTION_SKIP_TO_NEXT))
            .setStyle(MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0, 1, 2))
            .build()
    }

    override fun onTaskRemoved(rootIntent: Intent?) { Fade.restore(this); SpotifyCtl.keepAlive(this, false); SpotifyCtl.stop(); Voice.release(); stopSelf() }

    override fun onDestroy() {
        running = null
        try { unregisterReceiver(noisy) } catch (_: Exception) {}
        try { netCb?.let { getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(it) } } catch (_: Exception) {}
        if (wake?.isHeld == true) wake?.release(); if (wifi?.isHeld == true) wifi?.release()
        session.isActive = false; session.release()
        super.onDestroy()
    }

    override fun onBind(i: Intent?): IBinder? = null
}
