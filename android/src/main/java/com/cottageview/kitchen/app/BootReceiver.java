package com.cottageview.kitchen.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** HOME already brings us up at boot; this is belt and braces if another launcher ever wins. */
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) {
        c.startActivity(new Intent(c, KitchenActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }
}
