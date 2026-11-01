package gg.theidealcity.inka

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * App-Updates (Josef 1.11.2026: "dafür sorgen, dass das Programm Updates herunterladen kann", Android "mit Hinweis").
 * Prüft app/version.json im Repo, meldet neue Versionen (Benachrichtigung und in der App), lädt die APK mit
 * Prüfsumme und übergibt sie an den Android-Installationsdialog.
 */
object Updates {
    const val URL_VERSION = "https://raw.githubusercontent.com/FelixPfahl/theidealcity/inka/app/version.json"
    private const val CH = "inka_update"

    @Suppress("DEPRECATION")
    fun currentCode(c: Context): Long = try {
        val pi = c.packageManager.getPackageInfo(c.packageName, 0)
        if (Build.VERSION.SDK_INT >= 28) pi.longVersionCode else pi.versionCode.toLong()
    } catch (_: Exception) { 0L }

    fun currentName(c: Context): String = try { c.packageManager.getPackageInfo(c.packageName, 0).versionName ?: "" } catch (_: Exception) { "" }

    private fun prefs(c: Context) = c.getSharedPreferences("inka_upd", Context.MODE_PRIVATE)

    /** Stand für die Seite: {available, versionName, versionCode, current, checked} */
    fun info(c: Context): JSONObject {
        val p = prefs(c)
        val code = p.getLong("code", 0L)
        return JSONObject().put("available", code > currentCode(c)).put("versionName", p.getString("name", ""))
            .put("versionCode", code).put("current", currentName(c)).put("checked", p.getLong("at", 0L))
    }

    /** Netzabruf, nicht auf dem Hauptthread aufrufen. */
    fun check(c: Context): JSONObject {
        try {
            val con = URL("$URL_VERSION?x=" + System.currentTimeMillis()).openConnection() as HttpURLConnection
            con.connectTimeout = 8000; con.readTimeout = 15000; con.useCaches = false
            if (con.responseCode == 200) {
                val a = JSONObject(con.inputStream.use { String(it.readBytes()) }).getJSONObject("android")
                val code = a.getLong("versionCode")
                prefs(c).edit().putLong("code", code).putString("name", a.optString("versionName"))
                    .putString("url", a.optString("url")).putString("sha", a.optString("sha256").lowercase())
                    .putLong("at", System.currentTimeMillis()).apply()
                if (code > currentCode(c) && prefs(c).getLong("notified", 0L) != code) {
                    notify(c, a.optString("versionName")); prefs(c).edit().putLong("notified", code).apply()
                }
            }
        } catch (e: Exception) { Hub.log("Update-Pruefung: " + e.javaClass.simpleName) }
        val i = info(c)
        Hub.emit(JSONObject(i.toString()).put("type", "update").put("state", if (i.optBoolean("available")) "verfuegbar" else "aktuell"))
        return i
    }

    private fun notify(c: Context, name: String) {
        val nm = c.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CH, "Updates", NotificationManager.IMPORTANCE_DEFAULT))
        val open = PendingIntent.getActivity(c, 1, Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE)
        nm.notify(42, NotificationCompat.Builder(c, CH).setSmallIcon(R.drawable.ic_stat_inka)
            .setContentTitle("Inka-Update $name verfügbar").setContentText("Antippen, dann unter Überblick installieren.")
            .setContentIntent(open).setAutoCancel(true).build())
    }

    /** APK laden, prüfen und den Installationsdialog öffnen. Läuft im Hintergrund. */
    fun install(a: MainActivity) {
        Thread {
            val c = a.applicationContext
            val p = prefs(c)
            val url = p.getString("url", "") ?: ""
            val sha = p.getString("sha", "") ?: ""
            if (url.isBlank()) { Hub.js("window.toast&&toast('Kein Update bekannt.')"); return@Thread }
            if (Build.VERSION.SDK_INT >= 26 && !c.packageManager.canRequestPackageInstalls()) {
                Hub.js("window.toast&&toast('Bitte einmal erlauben, dass Inka Apps installieren darf. Danach erneut tippen.',9000)")
                a.runOnUiThread { try { a.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + c.packageName))) } catch (_: Exception) {} }
                return@Thread
            }
            try {
                val dir = File(c.cacheDir, "update").apply { mkdirs() }
                val f = File(dir, "inka.apk")
                val con = URL("$url?x=" + System.currentTimeMillis()).openConnection() as HttpURLConnection
                con.connectTimeout = 10000; con.readTimeout = 60000
                con.inputStream.use { inp -> f.outputStream().use { inp.copyTo(it) } }
                val got = MessageDigest.getInstance("SHA-256").digest(f.readBytes()).joinToString("") { "%02x".format(it) }
                if (sha.isNotBlank() && got != sha) { f.delete(); Hub.js("window.toast&&toast('Update beschädigt (Prüfsumme). Bitte später erneut.')"); return@Thread }
                val uri = FileProvider.getUriForFile(c, c.packageName + ".files", f)
                a.runOnUiThread {
                    a.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
                }
            } catch (e: Exception) { Hub.js("window.toast&&toast('Update ging nicht: " + e.javaClass.simpleName + "')") }
        }.start()
    }
}
