package gg.theidealcity.inka

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import org.json.JSONObject

/**
 * Eigener Lautstärkekanal für die Sprachspur (Josef 9.11.2026: "Du musst die Musik und die Sprachsegmente separat
 * kontrollieren können"). Ein Bedienungshilfen-Dienst, der nur die Bedienungshilfen-Lautstärke freischaltet
 * (FLAG_ENABLE_ACCESSIBILITY_VOLUME). Die Sprachspur läuft dann über diesen Kanal, Spotify über die Medienlautstärke.
 * Der Dienst liest keine Fensterinhalte und tut sonst nichts.
 */
class InkaKanal : AccessibilityService() {
    companion object { @Volatile var running = false }

    override fun onServiceConnected() {
        super.onServiceConnected()
        try { serviceInfo = serviceInfo.apply { flags = flags or AccessibilityServiceInfo.FLAG_ENABLE_ACCESSIBILITY_VOLUME } } catch (_: Exception) {}
        running = true
        Hub.diag("n-kanal", JSONObject().put("an", true))
        Hub.main.post { Voice.channelChanged() }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
    override fun onInterrupt() {}

    override fun onUnbind(intent: Intent?): Boolean {
        running = false
        Hub.diag("n-kanal", JSONObject().put("an", false))
        Hub.main.post { Voice.channelChanged() }
        return super.onUnbind(intent)
    }

    override fun onDestroy() { running = false; super.onDestroy() }
}
