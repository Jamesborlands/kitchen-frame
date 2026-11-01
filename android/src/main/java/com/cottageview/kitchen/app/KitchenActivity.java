package com.cottageview.kitchen.app;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import com.cottageview.kitchen.core.Feed;
import com.cottageview.kitchen.ui.KitchenView;

/** The kitchen: fullscreen, always on, the HOME screen. Night mode turns the backlight right down. */
public class KitchenActivity extends Activity {
    Controller controller;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Updater.guardOnStart(this); // roll back a freshly installed version that keeps crashing
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            | WindowManager.LayoutParams.FLAG_FULLSCREEN
            | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
            | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        KitchenView view = new KitchenView(this);
        view.setSystemUiVisibility(View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        view.setNightListener(new KitchenView.NightListener() {
            @Override public void onNight(boolean night) { setBrightness(night ? 0.04f : -1f); }
        });
        setContentView(view);
        controller = new Controller(this, view);
        controller.start();
    }

    void onFeed(Feed f) { if (controller != null) controller.maybeUpdate(f); }

    void setBrightness(float v) {
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.screenBrightness = v; // -1 = system default
        getWindow().setAttributes(lp);
    }

    @Override public void onBackPressed() { /* the kiosk has nowhere to go back to */ }

    // The frame has no Back or Home buttons: if anything ever takes the screen (a
    // system dialog, a stray settings page), the kitchen comes back by itself.
    static final long RETURN_AFTER_MS = 3 * 60_000;
    final android.os.Handler handler = new android.os.Handler();
    final Runnable comeBack = new Runnable() {
        @Override public void run() {
            startActivity(new android.content.Intent(KitchenActivity.this, KitchenActivity.class)
                .addFlags(android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
        }
    };

    @Override protected void onStart() { super.onStart(); handler.removeCallbacks(comeBack); }

    @Override protected void onStop() {
        super.onStop();
        if (!isFinishing()) handler.postDelayed(comeBack, RETURN_AFTER_MS);
    }

    @Override protected void onDestroy() {
        handler.removeCallbacks(comeBack);
        controller.stop();
        super.onDestroy();
    }
}
