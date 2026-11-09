package gg.theidealcity.inka

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import org.json.JSONArray

/** Eigene Benachrichtigungen der App (Josef 9.11.2026): Abfahrt 10 min vorher, Fristen morgens. Ohne Kontingent, direkt vom Handy.
 *  Die Seite übergibt die Liste bei jedem Rendern; die App plant sie mit dem AlarmManager (ungefähr pünktlich, auch im Schlaf). */
object Alarms {
    private const val CH = "inka-hinweise"
    private fun p(c: Context) = c.getSharedPreferences("inka-alarme", Context.MODE_PRIVATE)

    fun set(c: Context, json: String) {
        val a = try { JSONArray(json) } catch (_: Exception) { return }
        val old = p(c).getString("ids", "") ?: ""
        old.split(",").filter { it.isNotBlank() }.forEach { cancel(c, it) }
        val now = System.currentTimeMillis(); val ids = mutableListOf<String>()
        for (i in 0 until a.length()) {
            val o = a.optJSONObject(i) ?: continue
            val at = o.optLong("at", 0); if (at < now + 30_000 || at > now + 3 * 86400_000L) continue
            val id = o.optString("id"); if (id.isBlank()) continue
            schedule(c, id, at, o.optString("title"), o.optString("text")); ids.add(id)
        }
        p(c).edit().putString("ids", ids.joinToString(",")).putString("last", json).apply()
    }
    fun restore(c: Context) { p(c).getString("last", null)?.let { set(c, it) } }

    private fun pi(c: Context, id: String, title: String = "", text: String = ""): PendingIntent {
        val i = Intent(c, AlarmReceiver::class.java).putExtra("id", id).putExtra("title", title).putExtra("text", text)
        return PendingIntent.getBroadcast(c, id.hashCode(), i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    private fun schedule(c: Context, id: String, at: Long, title: String, text: String) {
        val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi(c, id, title, text))
    }
    private fun cancel(c: Context, id: String) { try { (c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pi(c, id)) } catch (_: Exception) {} }

    fun show(c: Context, id: String, title: String, text: String) {
        val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(NotificationChannel(CH, "Inka: Abfahrt und Fristen", NotificationManager.IMPORTANCE_HIGH))
        val open = PendingIntent.getActivity(c, 1, Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(c, CH).setSmallIcon(R.drawable.ic_stat_inka).setContentTitle(title).setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text)).setContentIntent(open).setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH).build()
        try { nm.notify(id.hashCode(), n) } catch (_: SecurityException) {}
    }
}
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) { Alarms.show(c, i.getStringExtra("id") ?: "x", i.getStringExtra("title") ?: "Inka", i.getStringExtra("text") ?: "") }
}
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) { if (i.action == Intent.ACTION_BOOT_COMPLETED) Alarms.restore(c) }
}
