package com.cottageview.kitchen.app;

import android.app.AlarmManager;
import android.app.Application;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.util.Log;
import com.cottageview.kitchen.core.CrashLog;
import java.io.File;

/** Process-wide setup: fonts, and a crash handler that records the crash and comes straight back. */
public class KitchenApp extends Application {
    static final String TAG = "Kitchen";

    @Override public void onCreate() {
        super.onCreate();
        com.cottageview.kitchen.ui.Fonts.load(getAssets());
        final Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override public void uncaughtException(Thread t, Throwable e) {
                Log.e(TAG, "crash", e);
                new CrashLog(new File(getFilesDir(), "crashes.log")).record(System.currentTimeMillis());
                restartSoon(KitchenApp.this, 3000);
                android.os.Process.killProcess(android.os.Process.myPid());
                System.exit(10);
            }
        });
    }

    static void restartSoon(Context c, long delayMs) {
        Intent i = new Intent(c, KitchenActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent pi = PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_CANCEL_CURRENT);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + delayMs, pi);
    }
}
