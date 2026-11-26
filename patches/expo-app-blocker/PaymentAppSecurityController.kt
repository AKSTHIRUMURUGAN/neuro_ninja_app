package expo.modules.appblocker

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * PaymentAppSecurityController:
 * Automatically pauses and restores Accessibility Services when financial, banking,
 * and UPI apps (like Google Pay, PhonePe, Paytm, BHIM) are opened.
 *
 * Prevents NPCI / Google Pay "Payments blocked for safety" security triggers.
 */
object PaymentAppSecurityController {
  private const val TAG = "PaymentSecurityGuard"
  private const val PAYMENT_NOTIFICATION_CHANNEL = "payment_safety_channel"
  private const val NOTIFICATION_ID = 9005

  @Volatile
  var isPaymentAppActive: Boolean = false
    private set

  private var activeBankingPackage: String? = null

  fun isBankingApp(packageName: String?): Boolean {
    if (packageName == null) return false
    if (packageName in AppBlockerPrefs.BANKING_PACKAGES) return true

    val lower = packageName.lowercase()
    return lower.contains("paisa.user") ||
      lower.contains("walletnfcrel") ||
      lower.contains("phonepe") ||
      lower.contains("paytm") ||
      lower.contains("upi") ||
      lower.contains("cred.app") ||
      lower.contains("slice") ||
      lower.contains("groww") ||
      lower.contains("zerodha") ||
      lower.contains("bhim") ||
      lower.contains("railone") ||
      lower.contains("cris") ||
      lower.contains("irctc")
  }

  fun hasWriteSecureSettings(context: Context): Boolean {
    return context.checkSelfPermission(Manifest.permission.WRITE_SECURE_SETTINGS) == PackageManager.PERMISSION_GRANTED
  }

  fun setAccessibilityEnabled(context: Context, enabled: Boolean): Boolean {
    if (!enabled) {
      try {
        NinjaAccessibilityService.activeInstance?.disableSelf()
      } catch (e: Exception) {
        Log.w(TAG, "Failed calling disableSelf()", e)
      }
    }
    if (!hasWriteSecureSettings(context)) {
      return !enabled
    }
    return try {
      val resolver = context.contentResolver
      val serviceComponent = "${context.packageName}/${NinjaAccessibilityService::class.java.name}"
      val current = Settings.Secure.getString(resolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
      val parts = current.split(":").filter { it.isNotBlank() && it != serviceComponent }.toMutableList()
      if (enabled) {
        parts.add(serviceComponent)
      }
      val updated = parts.joinToString(":")
      Settings.Secure.putString(resolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, updated)
      Settings.Secure.putInt(resolver, Settings.Secure.ACCESSIBILITY_ENABLED, if (updated.isNotBlank()) 1 else 0)
      if (!enabled) {
        try {
          NinjaAccessibilityService.activeInstance?.disableSelf()
        } catch (e: Exception) {
          Log.w(TAG, "Failed calling disableSelf() after setting", e)
        }
      }
      Log.i(TAG, "setAccessibilityEnabled($enabled) -> updated: '$updated'")
      true
    } catch (e: Exception) {
      Log.e(TAG, "setAccessibilityEnabled($enabled) failed", e)
      false
    }
  }

  fun isAccessibilityEnabled(context: Context): Boolean {
    val current = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
    val serviceComponent = "${context.packageName}/${NinjaAccessibilityService::class.java.name}"
    return current.contains(serviceComponent)
  }

  fun setAccessibilityServiceEnabled(context: Context, enabled: Boolean): Boolean {
    return setAccessibilityEnabled(context, enabled)
  }

  fun isAccessibilityServiceEnabled(context: Context): Boolean {
    val current = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
    val serviceComponent = "${context.packageName}/${NinjaAccessibilityService::class.java.name}"
    return current.contains(serviceComponent)
  }

  @Volatile
  private var wasAccessibilityActiveBeforePayment: Boolean = false

  fun onBankingAppForeground(context: Context, packageName: String) {
    if (isPaymentAppActive && activeBankingPackage == packageName) return
    wasAccessibilityActiveBeforePayment = isAccessibilityEnabled(context) || NinjaAccessibilityService.isRunning
    isPaymentAppActive = true
    activeBankingPackage = packageName
    Log.i(TAG, "💳 Banking / Payment app entered foreground: $packageName. Pausing accessibility safely (wasActive: $wasAccessibilityActiveBeforePayment).")

    // 1. Immediately drop any floating HUD or blocker overlays
    try {
      FloatingHudManager.instance?.hide()
      OverlayManager.instance?.hide()
    } catch (e: Exception) {
      Log.w(TAG, "Error hiding overlays", e)
    }

    // 2. Disable accessibility service
    val hasPermission = hasWriteSecureSettings(context)
    if (hasPermission) {
      try {
        val resolver = context.contentResolver
        val serviceComponent = "${context.packageName}/${NinjaAccessibilityService::class.java.name}"
        val current = Settings.Secure.getString(resolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
        val updated = current.split(":").filter { it.isNotBlank() && it != serviceComponent }.joinToString(":")
        Settings.Secure.putString(resolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, updated)
        if (updated.isBlank()) {
          Settings.Secure.putInt(resolver, Settings.Secure.ACCESSIBILITY_ENABLED, 0)
        }
        Log.i(TAG, "✅ Successfully toggled off accessibility via WRITE_SECURE_SETTINGS for $packageName")
      } catch (e: Exception) {
        Log.e(TAG, "Failed to update secure settings", e)
      }
    } else {
      Log.i(TAG, "WRITE_SECURE_SETTINGS not granted. Overlays hidden; preserving user accessibility toggle.")
      showPaymentActiveNotification(context, packageName)
    }
  }

  fun onBankingAppBackground(context: Context) {
    if (!isPaymentAppActive) return
    val exitedPkg = activeBankingPackage
    val shouldRestore = wasAccessibilityActiveBeforePayment
    isPaymentAppActive = false
    activeBankingPackage = null
    wasAccessibilityActiveBeforePayment = false
    Log.i(TAG, "💳 Exited payment app ($exitedPkg). Restoring accessibility: $shouldRestore")
    cancelNotification(context)

    if (shouldRestore && hasWriteSecureSettings(context)) {
      setAccessibilityEnabled(context, true)
    }
  }

  private fun createChannelIfNeeded(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
      val channel = NotificationChannel(
        PAYMENT_NOTIFICATION_CHANNEL,
        "Payment Safety Guard",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Alerts and 1-tap resume for Focus Guard during payments"
        setShowBadge(false)
      }
      manager.createNotificationChannel(channel)
    }
  }

  private fun showPaymentActiveNotification(context: Context, pkg: String) {
    createChannelIfNeeded(context)
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

    val iconRes = context.resources.getIdentifier("ic_notification_ninja", "drawable", context.packageName)
    val smallIcon = if (iconRes != 0) iconRes else context.applicationInfo.icon

    val notification = NotificationCompat.Builder(context, PAYMENT_NOTIFICATION_CHANNEL)
      .setContentTitle("💳 Secure Payment Mode Active")
      .setContentText("Focus Guard paused for safe transactions. Tap when done to resume.")
      .setSmallIcon(smallIcon)
      .setColor(android.graphics.Color.parseColor("#00E699"))
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(getSettingsPendingIntent(context))
      .build()

    manager.notify(NOTIFICATION_ID, notification)
  }

  private fun showPaymentDoneNotification(context: Context) {
    createChannelIfNeeded(context)
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

    val iconRes = context.resources.getIdentifier("ic_notification_ninja", "drawable", context.packageName)
    val smallIcon = if (iconRes != 0) iconRes else context.applicationInfo.icon

    val notification = NotificationCompat.Builder(context, PAYMENT_NOTIFICATION_CHANNEL)
      .setContentTitle("✅ Payment Complete")
      .setContentText("Tap here to resume NeuroNinja Focus Guard.")
      .setSmallIcon(smallIcon)
      .setColor(android.graphics.Color.parseColor("#00E699"))
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(getSettingsPendingIntent(context))
      .build()

    manager.notify(NOTIFICATION_ID, notification)
  }

  private fun cancelNotification(context: Context) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    manager?.cancel(NOTIFICATION_ID)
  }

  private fun getSettingsPendingIntent(context: Context): PendingIntent {
    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    return PendingIntent.getActivity(
      context,
      NOTIFICATION_ID,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}
