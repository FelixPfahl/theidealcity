package de.theidealcity.atelier;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * Phasenwechsel bei gesperrtem Handy: Pult übergibt den Phasenplan des Tages (mit allen Verschiebungen).
 * Zu jedem Phasenbeginn weckt ein Wecker die App, sie vibriert und zeigt eine Benachrichtigung mit
 * der laufenden Phase und einem Countdown bis zum Phasenende (läuft auf dem Sperrbildschirm von selbst).
 * Ist die App gerade offen, vibriert Pult selbst; dann wird hier nur die Benachrichtigung aktualisiert.
 */
public class PhaseAlarm extends BroadcastReceiver {
    static final String PREFS = "atelier", KEY = "plan", CHANNEL = "unterricht";
    static final int NOTE_ID = 1;
    static volatile boolean appVisible = false;

    @Override
    public void onReceive(Context ctx, Intent intent) {
        update(ctx, true);
    }

    /** Neuen Plan von Pult speichern und den nächsten Wecker stellen (ohne Vibration). */
    static void setPlan(Context ctx, String json) {
        ctx.getSharedPreferences(PREFS, 0).edit().putString(KEY, json).apply();
        update(ctx, false);
    }

    static void update(Context ctx, boolean fromAlarm) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, 0);
        String json = sp.getString(KEY, null);
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        long now = System.currentTimeMillis();
        try {
            if (json == null) { nm.cancel(NOTE_ID); return; }
            JSONObject o = new JSONObject(json);
            JSONArray ph = o.optJSONArray("ph");
            boolean pause = o.optBoolean("pause", false);
            channel(ctx, nm);
            if (pause) {
                nm.notify(NOTE_ID, build(ctx, "Pause", "Die Uhr steht. Weiter in Pult.", 0, false).build());
                cancelAlarm(ctx);
                return;
            }
            JSONObject cur = null, next = null;
            for (int i = 0; ph != null && i < ph.length(); i++) {
                JSONObject x = ph.getJSONObject(i);
                long s = x.getLong("s"), e = x.getLong("e");
                if (s <= now + 1500 && now < e - 1500) cur = x;
                if (s > now + 1500 && (next == null || s < next.getLong("s"))) next = x;
            }
            if (cur != null) {
                String title = hm(cur.getLong("s")) + " bis " + hm(cur.getLong("e")) + " · " + cur.optString("t");
                String text = cur.optString("k") + " · Phase " + cur.optInt("n") + " von " + cur.optInt("z")
                        + (next != null && next.getLong("s") - cur.getLong("e") < 60000 ? " · danach: " + next.optString("t") : " · danach Schluss");
                boolean wechsel = fromAlarm && Math.abs(now - cur.getLong("s")) < 120000;
                nm.notify(NOTE_ID, build(ctx, title, text, cur.getLong("e"), wechsel && !appVisible).build());
                if (wechsel && !appVisible) vibrate(ctx, cur.optBoolean("f", false));
            } else {
                nm.cancel(NOTE_ID);
            }
            /* nächster Wecker: nächster Phasenbeginn, sonst Ende der laufenden Phase (um die Benachrichtigung zu entfernen) */
            long at = next != null ? next.getLong("s") : (cur != null ? cur.getLong("e") : 0);
            if (at > now) setAlarm(ctx, at); else cancelAlarm(ctx);
        } catch (Exception ex) {
            nm.cancel(NOTE_ID);
        }
    }

    static String hm(long t) {
        Calendar c = Calendar.getInstance(); c.setTimeInMillis(t);
        return c.get(Calendar.HOUR_OF_DAY) + "." + String.format("%02d", c.get(Calendar.MINUTE));
    }

    static void channel(Context ctx, NotificationManager nm) {
        if (Build.VERSION.SDK_INT < 26) return;
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Unterricht: Phasenwechsel", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Laufende Phase und Restzeit, Hinweis beim Phasenwechsel");
        ch.enableVibration(false);   /* vibriert wird gezielt, nicht bei jeder Aktualisierung */
        ch.setSound(null, null);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    static Notification.Builder build(Context ctx, String title, String text, long ende, boolean alert) {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        Intent open = new Intent(ctx, MainActivity.class).putExtra("tab", "pult").addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        b.setSmallIcon(R.drawable.ic_stat_pult)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(pi)
                .setOngoing(true)
                .setOnlyAlertOnce(!alert)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setColor(0xFF0028FF);
        if (Build.VERSION.SDK_INT < 26) b.setPriority(alert ? Notification.PRIORITY_HIGH : Notification.PRIORITY_DEFAULT);
        if (ende > 0) {
            b.setWhen(ende).setShowWhen(true).setUsesChronometer(true);
            if (Build.VERSION.SDK_INT >= 24) b.setChronometerCountDown(true);
        }
        return b;
    }

    static void vibrate(Context ctx, boolean arbeit) {
        Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
        if (v == null) return;
        long[] muster = arbeit ? new long[]{0, 300, 150, 300, 150, 300} : new long[]{0, 450, 150, 450};
        if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(muster, -1));
        else v.vibrate(muster, -1);
    }

    static PendingIntent alarmIntent(Context ctx) {
        return PendingIntent.getBroadcast(ctx, 2, new Intent(ctx, PhaseAlarm.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void setAlarm(Context ctx, long at) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = alarmIntent(ctx);
        try {
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else if (Build.VERSION.SDK_INT >= 23) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else am.setExact(AlarmManager.RTC_WAKEUP, at, pi);
        } catch (SecurityException e) {
            am.set(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    static void cancelAlarm(Context ctx) {
        ((AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE)).cancel(alarmIntent(ctx));
    }
}
