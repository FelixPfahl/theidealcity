package gg.theidealcity.inka

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar

/** Widget "Als Nächstes" (Josef 9.11.2026): nächster Termin, Abfahrt, nächste Frist.
 *  Die Seite schreibt die kommenden Einträge (heute und morgen) als JSON; das Widget sucht beim Zeichnen den nächsten selbst heraus. */
class NextWidget : AppWidgetProvider() {
    override fun onUpdate(c: Context, m: AppWidgetManager, ids: IntArray) { ids.forEach { m.updateAppWidget(it, views(c)) } }

    companion object {
        fun save(c: Context, json: String) {
            try { JSONObject(json) } catch (_: Exception) { return }
            c.getSharedPreferences("inka-widget", Context.MODE_PRIVATE).edit().putString("d", json).apply()
            refresh(c)
        }
        fun refresh(c: Context) {
            val m = AppWidgetManager.getInstance(c)
            val ids = m.getAppWidgetIds(ComponentName(c, NextWidget::class.java))
            if (ids.isNotEmpty()) ids.forEach { m.updateAppWidget(it, views(c)) }
        }
        private fun mins(day: String, hm: String): Long? = try {
            val (y, mo, d) = day.split("-").map { it.toInt() }; val (h, mi) = hm.split(":").map { it.toInt() }
            Calendar.getInstance().apply { set(y, mo - 1, d, h, mi, 0); set(Calendar.MILLISECOND, 0) }.timeInMillis
        } catch (_: Exception) { null }
        private fun rel(ms: Long): String { val m = (ms / 60000).toInt(); return when { m < 1 -> "jetzt"; m < 60 -> "in $m min"; m < 24 * 60 -> "in ${m / 60} h" + (if (m % 60 >= 10) " ${m % 60}" else ""); else -> "morgen" } }

        fun views(c: Context): RemoteViews {
            val v = RemoteViews(c.packageName, R.layout.widget_next)
            val o = try { JSONObject(c.getSharedPreferences("inka-widget", Context.MODE_PRIVATE).getString("d", "{}")!!) } catch (_: Exception) { JSONObject() }
            val now = System.currentTimeMillis()
            var time = "–"; var title = "Nichts mehr heute"; var sub = ""
            val items = o.optJSONArray("items")
            if (items != null) for (i in 0 until items.length()) {
                val it = items.getJSONObject(i); val s = mins(it.optString("d"), it.optString("t")) ?: continue
                val e = mins(it.optString("d"), it.optString("e")) ?: s
                if (e < now && s < now) continue
                time = it.optString("t"); title = it.optString("title")
                sub = (if (s <= now) "läuft" else rel(s - now)) + (it.optString("kind").let { k -> if (k.isNotBlank()) " · $k" else "" })
                break
            }
            val trip = o.optJSONObject("trip"); var tripTxt = ""
            if (trip != null) { val s = mins(trip.optString("d"), trip.optString("leave")); if (s != null && s > now - 10 * 60000 && s - now < 3 * 3600_000L) tripTxt = "Los ${trip.optString("leave")} nach ${trip.optString("to")} · " + rel(s - now) }
            val dl = o.optString("deadline")
            v.setTextViewText(R.id.w_time, time); v.setTextViewText(R.id.w_title, title); v.setTextViewText(R.id.w_sub, sub)
            v.setTextViewText(R.id.w_trip, tripTxt); v.setTextViewText(R.id.w_dl, if (dl.isNotBlank()) "Frist: $dl" else "")
            val pi = PendingIntent.getActivity(c, 0, Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            v.setOnClickPendingIntent(R.id.w_root, pi)
            return v
        }
    }
}
