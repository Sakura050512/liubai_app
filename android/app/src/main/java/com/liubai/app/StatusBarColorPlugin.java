package com.liubai.app;

import android.os.Build;
import android.graphics.Color;
import android.view.View;
import android.view.Window;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;

public class StatusBarColorPlugin extends Plugin {

    @PluginMethod
    public void setBackgroundColor(PluginCall call) {
        String color = call.getString("color", "#fcf9f6");
        try {
            Window window = getActivity().getWindow();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                window.setStatusBarColor(Color.parseColor(color));
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set status bar color", e);
        }
    }

    @PluginMethod
    public void setLightStatusBar(PluginCall call) {
        boolean light = call.getBoolean("light", true);
        try {
            Window window = getActivity().getWindow();
            View view = window.getDecorView();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (light) {
                    view.setSystemUiVisibility(view.getSystemUiVisibility() | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
                } else {
                    view.setSystemUiVisibility(view.getSystemUiVisibility() & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set light status bar", e);
        }
    }
}