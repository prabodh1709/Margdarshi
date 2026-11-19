package com.margdarshi.app;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(name = "FocusLock")
public class FocusLockPlugin extends Plugin {
    private static final String PREFS = "margdarshi_focus_lock";
    private static final String ACTIVE = "active";
    private static final String PACKAGES = "packages";
    private static final String TASK_TITLE = "task_title";

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void getPermissionStatus(PluginCall call) {
        JSObject result = new JSObject();
        boolean overlayGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(getContext());
        result.put("overlayGranted", overlayGranted);
        result.put("accessibilityEnabled", FocusLockAccessibilityService.isEnabled(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        Intent launcherIntent = new Intent(Intent.ACTION_MAIN);
        launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        PackageManager packageManager = getContext().getPackageManager();
        List<ResolveInfo> activities = packageManager.queryIntentActivities(launcherIntent, 0);
        JSArray apps = new JSArray();

        for (ResolveInfo info : activities) {
            if (info.activityInfo == null) continue;
            String packageName = info.activityInfo.packageName;
            if (getContext().getPackageName().equals(packageName)) continue;
            JSObject app = new JSObject();
            app.put("packageName", packageName);
            app.put("label", String.valueOf(info.loadLabel(packageManager)));
            try {
                apps.put(app);
            } catch (JSONException error) {
                call.reject("Could not read installed apps", error);
                return;
            }
        }

        JSObject result = new JSObject();
        result.put("apps", apps);
        call.resolve(result);
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        try {
            getActivity().startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
            call.resolve();
        } catch (ActivityNotFoundException error) {
            call.reject("Android Accessibility settings are unavailable", error);
        }
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException error) {
            call.reject("Android overlay settings are unavailable", error);
        }
    }

    @PluginMethod
    public void startFocusLock(PluginCall call) {
        JSArray packageArray = call.getArray("packages");
        String taskTitle = call.getString("taskTitle", "Focused task");
        if (packageArray == null || packageArray.length() == 0) {
            call.reject("Select at least one app before starting Focus Lock");
            return;
        }

        boolean overlayGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(getContext());
        boolean accessibilityEnabled = FocusLockAccessibilityService.isEnabled(getContext());
        if (!overlayGranted || !accessibilityEnabled) {
            call.reject("Enable Accessibility and Display over other apps permissions first");
            return;
        }

        Set<String> packages = new HashSet<>();
        for (int index = 0; index < packageArray.length(); index++) {
            try {
                String packageName = packageArray.getString(index);
                if (!getContext().getPackageName().equals(packageName)) packages.add(packageName);
            } catch (JSONException ignored) {
                // Ignore malformed entries from the UI.
            }
        }

        preferences().edit()
            .putBoolean(ACTIVE, true)
            .putStringSet(PACKAGES, packages)
            .putString(TASK_TITLE, taskTitle == null ? "Focused task" : taskTitle)
            .apply();
        FocusLockAccessibilityService.refreshFromPlugin();

        JSObject result = new JSObject();
        result.put("active", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopFocusLock(PluginCall call) {
        preferences().edit().putBoolean(ACTIVE, false).remove(PACKAGES).remove(TASK_TITLE).apply();
        FocusLockAccessibilityService.stopFromPlugin();
        call.resolve();
    }
}
