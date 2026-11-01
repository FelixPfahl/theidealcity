package gg.theidealcity.inka

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.webkit.WebView
import org.json.JSONObject
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/** Verbindung zwischen nativer Seite und der Inka-Seite in der WebView. */
object Hub {
    const val PAGE = "https://raw.githack.com/FelixPfahl/theidealcity/inka/index.html"
    const val RAW = "https://raw.githubusercontent.com/FelixPfahl/theidealcity/inka/"
    const val REDIRECT = "inka://spotify-callback"
    const val TAG = "Inka"

    @Volatile var web: WebView? = null
    @Volatile var activity: MainActivity? = null
    val main = Handler(Looper.getMainLooper())

    fun js(code: String) { main.post { try { web?.evaluateJavascript(code, null) } catch (e: Exception) { Log.w(TAG, "js", e) } } }

    /** Ereignis an die Seite: window.__inkaNative({...}) */
    fun emit(o: JSONObject) { js("window.__inkaNative&&window.__inkaNative(" + o.toString() + ")") }

    fun log(msg: String) { Log.i(TAG, msg) }
}

object Prefs {
    private fun p(c: Context) = c.getSharedPreferences("inka", Context.MODE_PRIVATE)
    fun key(c: Context): String = p(c).getString("k", "") ?: ""
    fun setKey(c: Context, k: String) { if (k.isNotBlank()) p(c).edit().putString("k", k.trim()).apply() }
    fun clientId(c: Context): String = p(c).getString("c", "") ?: ""
    fun setClientId(c: Context, id: String) { if (id.isNotBlank()) p(c).edit().putString("c", id.trim()).apply() }
}

/** Entschlüsselt die Umschläge {v, iv, ct} der Inka-Daten (AES-GCM, Schlüssel base64url, 32 Byte). */
object Crypt {
    fun open(keyB64Url: String, env: String): JSONObject? = try {
        val k = Base64.decode(keyB64Url, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        val o = JSONObject(env)
        val iv = Base64.decode(o.getString("iv"), Base64.DEFAULT)
        val ct = Base64.decode(o.getString("ct"), Base64.DEFAULT)
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.DECRYPT_MODE, SecretKeySpec(k, "AES"), GCMParameterSpec(128, iv))
        JSONObject(String(c.doFinal(ct), Charsets.UTF_8))
    } catch (e: Exception) { Hub.log("entschluesseln: " + e.javaClass.simpleName); null }
}
