package gg.theidealcity.inka

import android.content.Context
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayInputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Shows vorab aufs Handy laden und offline ausliefern (Josef 1.11.2026: "Automatisch vorladen", für Zug und Funklöcher).
 * Die Seite lädt ihre Daten von raw.githubusercontent.com; diese Abrufe laufen hier durch:
 * Audio (.bin) kommt aus dem Speicher, wenn die Fassung (?t=) schon da ist, sonst aus dem Netz (und wird gespeichert).
 * JSON und die Seite selbst: erst Netz (kurzer Zeitrahmen), sonst Speicher.
 */
object OfflineStore {
    private val CORS = mapOf("Access-Control-Allow-Origin" to "*", "Cache-Control" to "no-store")

    fun dir(c: Context) = File(c.filesDir, "offline").apply { mkdirs() }

    fun intercept(c: Context, req: WebResourceRequest): WebResourceResponse? = try { interceptInner(c, req) } catch (e: Exception) { Hub.log("Abfangen: " + e.javaClass.simpleName); null }

    private fun interceptInner(c: Context, req: WebResourceRequest): WebResourceResponse? {
        if (req.method != "GET") return null
        val url = req.url
        val base = url.scheme + "://" + url.host + url.path
        return when {
            base.startsWith(Hub.RAW + "d/") -> data(c, url, base.removePrefix(Hub.RAW + "d/"))
            base == Hub.PAGE -> page(c, url)
            else -> null
        }
    }

    private fun mime(name: String) = when {
        name.endsWith(".json") -> "application/json"
        name.endsWith(".html") -> "text/html"
        else -> "application/octet-stream"
    }

    private fun resp(bytes: ByteArray, name: String, code: Int = 200) =
        WebResourceResponse(mime(name), "utf-8", code, if (code == 200) "OK" else "Not Found", CORS, ByteArrayInputStream(bytes))

    private fun fetch(u: String, timeoutMs: Int): Pair<Int, ByteArray?> = try {
        val con = URL(u).openConnection() as HttpURLConnection
        con.connectTimeout = timeoutMs; con.readTimeout = if (timeoutMs >= 15000) 60000 else timeoutMs; con.useCaches = false
        val code = con.responseCode
        if (code == 200) code to con.inputStream.use { it.readBytes() } else code to null
    } catch (e: Exception) { -1 to null }

    private fun save(f: File, b: ByteArray) { val t = File(f.path + ".tmp"); t.writeBytes(b); t.renameTo(f) }

    private fun data(c: Context, url: Uri, name: String): WebResourceResponse? {
        val d = dir(c)
        if (name.endsWith(".bin")) {
            val t = url.getQueryParameter("t") ?: "0"
            val exact = File(d, "$name.$t")
            if (exact.exists()) return resp(exact.readBytes(), name)
            val (code, b) = fetch(url.toString(), 15000)
            if (b != null) { d.listFiles { f -> f.name.startsWith("$name.") }?.forEach { it.delete() }; save(exact, b); return resp(b, name) }
            val any = d.listFiles { f -> f.name.startsWith("$name.") && !f.name.endsWith(".tmp") }?.maxByOrNull { it.lastModified() }
            if (any != null) return resp(any.readBytes(), name)
            return if (code == 404) resp(ByteArray(0), name, 404) else null
        }
        val f = File(d, name)
        val (code, b) = fetch(url.toString(), 5000)
        if (b != null) { save(f, b); return resp(b, name) }
        if (code == 404) return resp(ByteArray(0), name, 404)
        return if (f.exists()) resp(f.readBytes(), name) else null
    }

    private fun page(c: Context, url: Uri): WebResourceResponse? {
        val f = File(dir(c), "index.html")
        val (_, b) = fetch(Hub.PAGE + "?v=" + System.currentTimeMillis(), 5000)
        if (b != null) { save(f, b); return resp(b, "index.html") }
        return if (f.exists()) resp(f.readBytes(), "index.html") else null
    }

    /** Vorladen: Index entschlüsseln, alle Shows ab gestern holen (Text und Audio in der aktuellen Fassung). */
    fun prefetch(c: Context): String {
        val key = Prefs.key(c); if (key.isBlank()) return "kein Schlüssel"
        val d = dir(c)
        val (_, ib) = fetch(Hub.RAW + "d/shows.json?x=" + System.currentTimeMillis(), 10000)
        if (ib == null) return "kein Netz"
        save(File(d, "shows.json"), ib)
        val idx = Crypt.open(key, String(ib)) ?: return "Index nicht lesbar"
        val shows = idx.optJSONArray("shows") ?: return "leer"
        val day = SimpleDateFormat("yyyy-MM-dd", Locale.GERMANY).format(Date(System.currentTimeMillis() - 86400000L))
        var n = 0
        for (i in 0 until shows.length()) {
            val s = shows.getJSONObject(i)
            val id = s.optString("id"); if (id.isBlank() || s.optString("day") < day) continue
            val (_, jb) = fetch(Hub.RAW + "d/$id.json?x=" + System.currentTimeMillis(), 10000)
            if (jb != null) save(File(d, "$id.json"), jb)
            val doc = jb?.let { Crypt.open(key, String(it)) }
            val t = doc?.optLong("published", 0L)?.toString() ?: s.optString("published", "0")
            if (doc != null && !doc.optBoolean("audio", true)) continue
            val f = File(d, "$id.bin.$t")
            if (!f.exists()) {
                val (_, bb) = fetch(Hub.RAW + "d/$id.bin?t=$t", 15000)
                if (bb != null) { d.listFiles { x -> x.name.startsWith("$id.bin.") }?.forEach { it.delete() }; save(f, bb); n++ }
            }
        }
        fetch(Hub.RAW + "d/app.json?x=" + System.currentTimeMillis(), 10000).second?.let { save(File(d, "app.json"), it) }
        fetch(Hub.PAGE + "?v=" + System.currentTimeMillis(), 10000).second?.let { save(File(d, "index.html"), it) }
        // alte Fassungen aufräumen (älter als 10 Tage)
        val cut = System.currentTimeMillis() - 10L * 86400000L
        d.listFiles()?.forEach { if (it.lastModified() < cut) it.delete() }
        return "ok, $n neu"
    }

    /** Liste der offline verfügbaren Show-Audios (für die Anzeige in der App). */
    fun cachedIds(c: Context): List<String> =
        dir(c).listFiles { f -> f.name.contains(".bin.") && !f.name.endsWith(".tmp") }?.map { it.name.substringBefore(".bin.") }?.sorted() ?: emptyList()

    fun schedule(c: Context) {
        val net = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        val wm = WorkManager.getInstance(c)
        wm.enqueueUniquePeriodicWork("vorladen", ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<PrefetchWorker>(2, TimeUnit.HOURS).setConstraints(net).build())
        now(c)
    }

    fun now(c: Context) {
        val net = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        WorkManager.getInstance(c).enqueueUniqueWork("vorladen-jetzt", ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<PrefetchWorker>().setConstraints(net).build())
    }
}

class PrefetchWorker(ctx: Context, p: WorkerParameters) : CoroutineWorker(ctx, p) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val r = OfflineStore.prefetch(applicationContext)
        try { Outbox.flush(applicationContext) } catch (_: Exception) {}
        try { NextWidget.refresh(applicationContext) } catch (_: Exception) {}
        try { Updates.check(applicationContext) } catch (_: Exception) {}
        Hub.log("Vorladen: $r")
        Hub.emit(org.json.JSONObject().put("type", "offline").put("ev", r)
            .put("ids", org.json.JSONArray(OfflineStore.cachedIds(applicationContext))))
        if (r == "kein Netz") Result.retry() else Result.success()
    }
}
