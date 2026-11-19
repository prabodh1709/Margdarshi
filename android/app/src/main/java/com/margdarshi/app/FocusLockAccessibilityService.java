package com.margdarshi.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class FocusLockAccessibilityService extends AccessibilityService {
    private static final String PREFS = "margdarshi_focus_lock";
    private static final String ACTIVE = "active";
    private static final String PACKAGES = "packages";
    private static final String TASK_TITLE = "task_title";
    private static FocusLockAccessibilityService current;

    private WindowManager windowManager;
    private FrameLayout blocker;
    private SharedPreferences preferences;
    private Set<String> blockedPackages = Collections.emptySet();
    private boolean active;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        current = this;
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        preferences = getSharedPreferences(PREFS, MODE_PRIVATE);
        reloadState();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;
        reloadState();
        String packageName = String.valueOf(event.getPackageName());
        if (active && blockedPackages.contains(packageName) && !getPackageName().equals(packageName)) {
            showBlocker();
        } else if (!blockedPackages.contains(packageName) || getPackageName().equals(packageName)) {
            removeBlocker();
        }
    }

    @Override
    public void onInterrupt() {
        removeBlocker();
    }

    @Override
    public void onDestroy() {
        removeBlocker();
        if (current == this) current = null;
        super.onDestroy();
    }

    static void refreshFromPlugin() {
        if (current != null) current.reloadState();
    }

    static void stopFromPlugin() {
        if (current != null) {
            current.active = false;
            current.blockedPackages = Collections.emptySet();
            current.removeBlocker();
        }
    }

    private void reloadState() {
        if (preferences == null) preferences = getSharedPreferences(PREFS, MODE_PRIVATE);
        active = preferences.getBoolean(ACTIVE, false);
        blockedPackages = new HashSet<>(preferences.getStringSet(PACKAGES, Collections.emptySet()));
    }

    static boolean isEnabled(Context context) {
        android.view.accessibility.AccessibilityManager manager =
            (android.view.accessibility.AccessibilityManager) context.getSystemService(Context.ACCESSIBILITY_SERVICE);
        if (manager == null || !manager.isEnabled()) return false;
        List<AccessibilityServiceInfo> services = manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK);
        String packageName = context.getPackageName();
        for (AccessibilityServiceInfo service : services) {
            if (service.getResolveInfo() == null || service.getResolveInfo().serviceInfo == null) continue;
            if (packageName.equals(service.getResolveInfo().serviceInfo.packageName)
                && service.getResolveInfo().serviceInfo.name.equals(FocusLockAccessibilityService.class.getName())) {
                return true;
            }
        }
        return false;
    }

    @SuppressLint("SetTextI18n")
    private void showBlocker() {
        if (blocker != null || windowManager == null) return;

        blocker = new FrameLayout(this);
        blocker.setBackgroundColor(Color.argb(242, 20, 32, 29));

        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER_HORIZONTAL);
        panel.setPadding(56, 64, 56, 64);
        GradientDrawable panelBackground = new GradientDrawable();
        panelBackground.setColor(Color.rgb(31, 61, 51));
        panelBackground.setCornerRadius(34);
        panel.setBackground(panelBackground);

        TextView brand = new TextView(this);
        brand.setText("MARGDARSHI · FOCUS LOCK");
        brand.setTextColor(Color.rgb(169, 231, 198));
        brand.setTextSize(12);
        brand.setGravity(Gravity.CENTER);
        panel.addView(brand, new LinearLayout.LayoutParams(-1, -2));

        TextView title = new TextView(this);
        title.setText("Stay with your task");
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 24, 0, 12);
        panel.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView task = new TextView(this);
        task.setText(preferences.getString(TASK_TITLE, "Focused task"));
        task.setTextColor(Color.rgb(220, 242, 229));
        task.setTextSize(18);
        task.setGravity(Gravity.CENTER);
        task.setPadding(0, 0, 0, 28);
        panel.addView(task, new LinearLayout.LayoutParams(-1, -2));

        TextView hint = new TextView(this);
        hint.setText("Complete this task in Margdarshi to unlock selected apps.");
        hint.setTextColor(Color.rgb(193, 220, 208));
        hint.setTextSize(15);
        hint.setGravity(Gravity.CENTER);
        panel.addView(hint, new LinearLayout.LayoutParams(-1, -2));

        Button returnButton = new Button(this);
        returnButton.setText("Return to Margdarshi");
        returnButton.setOnClickListener(view -> openMargdarshi());
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(-1, -2);
        buttonParams.topMargin = 32;
        panel.addView(returnButton, buttonParams);

        FrameLayout.LayoutParams panelParams = new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER);
        panelParams.leftMargin = 28;
        panelParams.rightMargin = 28;
        blocker.addView(panel, panelParams);

        int type = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            -1, -1, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;

        try {
            windowManager.addView(blocker, params);
        } catch (WindowManager.BadTokenException | SecurityException error) {
            blocker = null;
        }
    }

    private void openMargdarshi() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(launch);
        }
        removeBlocker();
    }

    private void removeBlocker() {
        if (blocker == null || windowManager == null) return;
        try { windowManager.removeView(blocker); } catch (IllegalArgumentException ignored) { }
        blocker = null;
    }
}
