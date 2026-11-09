package gg.theidealcity.inka

import android.content.Context
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL

/** Offene Aufträge der Seite ans Sekretariat (Josef 9.11.2026). ntfy hält Nachrichten nur 12 Stunden, der Morgencheck liest um 4:17.
 *  Deshalb sendet die App jeden Auftrag ohne Quittung alle 6 Stunden erneut (gleiche id, das Sekretariat führt ihn nur einmal aus). */
object Outbox {
    private fun p(c: Context) = c.getSharedPreferences("inka-outbox", Context.MODE_PRIVATE)
    fun set(c: Context, json: String) { try { JSONArray(json); p(c).edit().putString("q", json).apply() } catch (_: Exception) {} }

    fun flush(c: Context) {
        val key = Prefs.key(c); val topic = Prefs.topic(c); if (key.isBlank() || topic.isBlank()) return
        val q = try { JSONArray(p(c).getString("q", "[]")) } catch (_: Exception) { return }
        val now = System.currentTimeMillis(); var sent = 0
        for (i in 0 until q.length()) {
            val m = q.optJSONObject(i) ?: continue
            if (now - m.optLong("t", now) > 4 * 86400_000L) continue
            val last = p(c).getLong("s:" + m.optString("id"), 0)
            if (now - last < 6 * 3600_000L) continue
            val env = Crypt.seal(key, m.toString()) ?: continue
            try {
                val h = URL("https://ntfy.sh/$topic").openConnection() as HttpURLConnection
                h.requestMethod = "POST"; h.doOutput = true; h.connectTimeout = 15000; h.readTimeout = 15000
                h.outputStream.use { it.write(env.toByteArray()) }
                if (h.responseCode in 200..299) { p(c).edit().putLong("s:" + m.optString("id"), now).apply(); sent++ }
                h.disconnect()
            } catch (_: Exception) {}
        }
        if (sent > 0) Hub.log("Nachgesendet: $sent")
    }
}
