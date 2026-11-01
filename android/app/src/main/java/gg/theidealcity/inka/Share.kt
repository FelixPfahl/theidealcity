package gg.theidealcity.inka

import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/** Show-Audio entschlüsseln und mit dem Text teilen (z. B. an Google Drive). */
object Share {
    fun show(a: MainActivity, id: String, name: String, text: String) {
        try {
            val c = a.applicationContext
            val key = Prefs.key(c); if (key.isBlank()) { Hub.js("window.toast&&toast('Kein Schlüssel.')"); return }
            val off = OfflineStore.dir(c).listFiles { f -> f.name.startsWith("$id.bin.") && !f.name.endsWith(".tmp") }?.maxByOrNull { it.lastModified() }
            val enc: ByteArray = off?.readBytes() ?: run {
                val con = URL(Hub.RAW + "d/$id.bin?x=" + System.currentTimeMillis()).openConnection() as HttpURLConnection
                con.connectTimeout = 10000; con.readTimeout = 60000
                con.inputStream.use { it.readBytes() }
            }
            val k = android.util.Base64.decode(key, android.util.Base64.URL_SAFE or android.util.Base64.NO_WRAP or android.util.Base64.NO_PADDING)
            val ci = Cipher.getInstance("AES/GCM/NoPadding")
            ci.init(Cipher.DECRYPT_MODE, SecretKeySpec(k, "AES"), GCMParameterSpec(128, enc.copyOfRange(0, 12)))
            val audio = ci.doFinal(enc, 12, enc.size - 12)
            val dir = File(c.cacheDir, "share").apply { mkdirs(); listFiles()?.forEach { it.delete() } }
            val safe = name.filter { it !in "\\/:*?\"<>|" }.trim().ifBlank { "Inka $id" }
            val fa = File(dir, "$safe.m4a").apply { writeBytes(audio) }
            val ft = File(dir, "$safe.txt").apply { writeText(text) }
            val uris = arrayListOf<Uri>(
                FileProvider.getUriForFile(c, c.packageName + ".files", fa),
                FileProvider.getUriForFile(c, c.packageName + ".files", ft))
            val send = Intent(Intent.ACTION_SEND_MULTIPLE); send.type = "*/*"; send.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
            send.putExtra(Intent.EXTRA_SUBJECT, safe); send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            a.runOnUiThread { a.startActivity(Intent.createChooser(send, "Show sichern").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)) }
        } catch (e: Exception) { Hub.js("window.toast&&toast('Teilen ging nicht: " + e.javaClass.simpleName + "')") }
    }
}
