package expo.modules.appblocker

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat

class AppBlockerService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var lastForegroundPackage: String? = null
  // Last *known* foreground app. UsageStats only reports recent transitions, so a
  // poll can momentarily read null while the user sits in one app — we retain the
  // last non-null reading so earned-time consumption and re-blocking stay reliable.
  private var currentForeground: String? = null
  private lateinit var overlayManager: OverlayManager
  private lateinit var floatingHudManager: FloatingHudManager
  private val unlockController by lazy { TemporaryUnlockController(this) }
  // Timestamp of the last tick spent consuming earned time; 0 when not consuming.
  private var consumingSinceMs = 0L
  // Whether a block is currently being enforced (overlay shown / app redirected).
  private var blocking = false

  private val pollRunnable = object : Runnable {
    override fun run() {
      tick()
      handler.postDelayed(this, POLL_INTERVAL_MS)
    }
  }

  private fun isShortVideoApp(packageName: String?): Boolean {
    if (packageName == null) return false
    return packageName == "com.google.android.youtube" ||
      packageName == "com.instagram.android" ||
      packageName.contains("youtube") ||
      packageName.contains("instagram")
  }

  private fun isOurAppForeground(): Boolean = AppForegroundTracker.isMainActivityResumed

  private fun tick() {
    if (isOurAppForeground()) {
      currentForeground = packageName
      lastForegroundPackage = packageName
      floatingHudManager.hide()
      clearBlock()
      return
    }

    getCurrentForegroundPackage()?.let { pkg ->
      if (pkg != "com.android.systemui" && pkg != "android") {
        currentForeground = pkg
      }
    }
    val foreground = currentForeground
    val hudEnabled = AppBlockerPrefs.isFloatingHudEnabled(this)

    if (foreground == packageName || foreground == "com.neuroninja.app" || foreground?.contains("neuroninja") == true) {
      floatingHudManager.hide()
      clearBlock()
      lastForegroundPackage = foreground
      return
    }

    if (PaymentAppSecurityController.isBankingApp(foreground)) {
      floatingHudManager.hide()
      clearBlock()
      lastForegroundPackage = foreground
      if (foreground != null) {
        PaymentAppSecurityController.onBankingAppForeground(this, foreground)
      }
      return
    } else if (PaymentAppSecurityController.isPaymentAppActive) {
      PaymentAppSecurityController.onBankingAppBackground(this)
    }

    if (foreground == null || !isBlocked(foreground)) {
      // Outside any blocked app: pause consumption and drop any active block.
      consumingSinceMs = 0L
      clearBlock()

      val isShortVideo = foreground != null && isShortVideoApp(foreground)

      if (hudEnabled && isShortVideo) {
        floatingHudManager.show(foreground!!)
      } else {
        floatingHudManager.hide()
      }

      lastForegroundPackage = foreground
      return
    }

    val isTemporarilyAllowed = AppBlockerPrefs.isPackageTemporarilyAllowed(this, foreground)
    val isCurfew = AppBlockerPrefs.isCurrentTimeInCurfew(this)

    if (isTemporarilyAllowed) {
      // Inside a blocked app with an active per-package pass — consume active in-app budget.
      val now = System.currentTimeMillis()
      if (consumingSinceMs > 0L) {
        val elapsed = now - consumingSinceMs
        if (elapsed > 0) {
          AppBlockerPrefs.consumeInAppMs(this, foreground, elapsed)
          unlockController.consume(elapsed)
        }
      }
      consumingSinceMs = now
      if (AppBlockerPrefs.isPackageTemporarilyAllowed(this, foreground)) {
        clearBlock()
        val isShortVideo = isShortVideoApp(foreground)
        if (hudEnabled && (isShortVideo || isBlocked(foreground))) {
          floatingHudManager.show(foreground)
        }
      } else {
        // Active in-app budget exhausted!
        Log.d(TAG, "Active in-app budget exhausted in foreground app: $foreground")
        consumingSinceMs = 0L
        floatingHudManager.hide()
        enforceBlock(foreground, BlockReason.EXPIRED)
      }
    } else {
      // Inside a blocked app with no earned time or curfew active — block on entry.
      consumingSinceMs = 0L
      floatingHudManager.hide()
      if (!blocking || foreground != lastForegroundPackage || !overlayManager.isShowing()) {
        Log.d(TAG, "Blocked app in foreground (curfew=$isCurfew): $foreground")
        enforceBlock(foreground, if (isCurfew) BlockReason.CURFEW else BlockReason.OPENED)
      }
    }
    lastForegroundPackage = foreground
  }

  private fun clearBlock() {
    overlayManager.hide()
    blocking = false
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
    Log.d(TAG, "AppBlockerService onCreate")
    overlayManager = OverlayManager(this)
    floatingHudManager = FloatingHudManager(this)
    createChannelsIfNeeded()

    // Purge legacy notification IDs
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    try {
      manager?.cancel(1)
      manager?.cancel(1001)
      manager?.cancel(8801)
      manager?.cancel(BLOCKED_NOTIFICATION_ID)
    } catch (e: Exception) {}

    startForeground(NOTIFICATION_ID, buildNotification())
    handler.post(pollRunnable)
  }

  override fun onDestroy() {
    super.onDestroy()
    instance = null
    Log.d(TAG, "AppBlockerService onDestroy")
    handler.removeCallbacks(pollRunnable)
    floatingHudManager.hide()
    overlayManager.hide()
  }

  fun handleWindowStateChanged(packageName: String) {
    if (PaymentAppSecurityController.isBankingApp(packageName)) {
      floatingHudManager.hide()
      clearBlock()
      currentForeground = packageName
      lastForegroundPackage = packageName
      PaymentAppSecurityController.onBankingAppForeground(this, packageName)
      return
    } else if (PaymentAppSecurityController.isPaymentAppActive) {
      PaymentAppSecurityController.onBankingAppBackground(this)
    }

    if (packageName == this.packageName) {
      floatingHudManager.hide()
      currentForeground = packageName
      lastForegroundPackage = packageName
      return
    }
    if (packageName == "com.android.systemui" || packageName == "android") return
    currentForeground = packageName

    val hudEnabled = AppBlockerPrefs.isFloatingHudEnabled(this)
    val isShortVideo = isShortVideoApp(packageName)

    if (!isBlocked(packageName)) {
      consumingSinceMs = 0L
      clearBlock()
      if (hudEnabled && isShortVideo) {
        floatingHudManager.show(packageName)
      } else {
        floatingHudManager.hide()
      }
      lastForegroundPackage = packageName
      return
    }

    val isTemporarilyAllowed = AppBlockerPrefs.isPackageTemporarilyAllowed(this, packageName)
    val isCurfew = AppBlockerPrefs.isCurrentTimeInCurfew(this)
    if (isTemporarilyAllowed) {
      clearBlock()
      if (hudEnabled && (isShortVideo || isBlocked(packageName))) {
        floatingHudManager.show(packageName)
      }
    } else {
      // Instant 0ms Interception via Accessibility Event push callback
      consumingSinceMs = 0L
      floatingHudManager.hide()
      if (!blocking || packageName != lastForegroundPackage || !overlayManager.isShowing()) {
        Log.d(TAG, "Instant 0ms Intercept via Accessibility (curfew=$isCurfew): $packageName")
        enforceBlock(packageName, if (isCurfew) BlockReason.CURFEW else BlockReason.OPENED)
      }
    }
    lastForegroundPackage = packageName
  }

  private fun isBlocked(packageName: String): Boolean =
    packageName in AppBlockerPrefs.getBlockedPackages(this)

  fun enforceBlock(packageName: String, reason: BlockReason) {
    overlayManager.show(packageName, reason)
    showBlockedNotification(packageName, reason)
    recordIntercept(packageName)
    blocking = true
    consumingSinceMs = 0L
  }

  /** Queue this block event for the app to drain (debounced in prefs). */
  private fun recordIntercept(packageName: String) {
    val appName = try {
      val pm = this.packageManager
      pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString()
    } catch (e: Exception) {
      packageName
    }
    AppBlockerPrefs.appendIntercept(this, appName, System.currentTimeMillis())
  }

  private fun showBlockedNotification(packageName: String, reason: BlockReason) {
    val appName = try {
      val pm = this.packageManager
      val appInfo = pm.getApplicationInfo(packageName, 0)
      pm.getApplicationLabel(appInfo).toString()
    } catch (e: Exception) {
      packageName
    }

    val title = AppBlockerPrefs.getNotificationTitle(this).replace("{appName}", appName)
    val text = AppBlockerPrefs.getNotificationText(this).replace("{appName}", appName)

    val scheme = getAppScheme()
    val deepLinkIntent = Intent(
      Intent.ACTION_VIEW,
      Uri.parse(
        "${scheme}://blocked?app=${Uri.encode(appName)}" +
          "&package=${Uri.encode(packageName)}&reason=${reason.slug}"
      )
    ).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    val launchIntent = packageManager.getLaunchIntentForPackage(this.packageName)
      ?.apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP) }

    val resolvedIntent = try {
      deepLinkIntent.resolveActivity(packageManager)?.let { deepLinkIntent } ?: launchIntent
    } catch (e: Exception) {
      launchIntent
    } ?: deepLinkIntent

    val pendingIntent = PendingIntent.getActivity(
      this, packageName.hashCode(), resolvedIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val iconRes = resources.getIdentifier("ic_notification_ninja", "drawable", packageName)
    val smallIcon = if (iconRes != 0) iconRes else applicationInfo.icon

    val notification = NotificationCompat.Builder(this, BLOCKED_CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(smallIcon)
      .setColor(android.graphics.Color.parseColor("#00E699"))
      .setAutoCancel(true)
      .setTimeoutAfter(4000L)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(pendingIntent)
      .build()

    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(BLOCKED_NOTIFICATION_ID, notification)
  }

  private fun getAppScheme(): String {
    val resId = resources.getIdentifier("expo_app_blocker_scheme", "string", packageName)
    if (resId != 0) return getString(resId)
    return try {
      packageManager.getLaunchIntentForPackage(packageName)?.data?.scheme
        ?: packageName.replace(".", "-")
    } catch (e: Exception) {
      packageName.replace(".", "-")
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_TEMPORARY_UNLOCK -> {
        val minutes = intent.getIntExtra(EXTRA_DURATION_MINUTES, 0)
        Log.d(TAG, "Granting $minutes minutes of earned time")
        unlockController.grant(minutes)
        consumingSinceMs = 0L
        clearBlock()
      }
      ACTION_RELOCK -> {
        Log.d(TAG, "Relock: dropping earned time")
        unlockController.clear()
        consumingSinceMs = 0L
        // Forget the last-seen app so a blocked app already in the foreground is
        // re-blocked on the next poll. Clearing currentForeground too avoids a
        // stale reading wrongly blocking a non-blocked app if the next poll reads null.
        lastForegroundPackage = null
        currentForeground = null
        clearBlock()
      }
    }
    return START_STICKY
  }

  private fun getCurrentForegroundPackage(): String? {
    val usageStatsManager =
      getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
    val endTime = System.currentTimeMillis()

    // 1. High-speed queryUsageStats check with INTERVAL_BEST (fastest real-time resolution)
    try {
      val statsList = usageStatsManager.queryUsageStats(
        UsageStatsManager.INTERVAL_BEST,
        endTime - 5_000L,
        endTime
      )
      val mostRecent = statsList
        ?.filter { it.lastTimeUsed > 0 && it.packageName != packageName }
        ?.maxByOrNull { it.lastTimeUsed }
      if (mostRecent != null && (endTime - mostRecent.lastTimeUsed) < 3_500L) {
        return mostRecent.packageName
      }
    } catch (e: Exception) {
      Log.w(TAG, "Fast queryUsageStats check failed", e)
    }

    // 2. Real-time UsageEvents stream with tight 4-second lookback
    val beginTime = endTime - 4_000L
    try {
      val events = usageStatsManager.queryEvents(beginTime, endTime)
      val event = UsageEvents.Event()
      var latestForeground: String? = null
      while (events.hasNextEvent()) {
        events.getNextEvent(event)
        if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED ||
            event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
            event.eventType == UsageEvents.Event.USER_INTERACTION) {
          if (event.packageName != null && event.packageName != packageName) {
            latestForeground = event.packageName
          }
        }
      }
      if (latestForeground != null) {
        return latestForeground
      }
    } catch (e: Exception) {
      Log.w(TAG, "Error querying usage events", e)
    }

    return null
  }

  private fun createChannelsIfNeeded() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

      val serviceChannel = NotificationChannel(
        CHANNEL_ID, "Focus Guard Active", NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Maintains distraction shield and silence barriers"
        setShowBadge(false)
      }
      manager.createNotificationChannel(serviceChannel)

      val blockedChannel = NotificationChannel(
        BLOCKED_CHANNEL_ID, "Shield Breach Alerts", NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Notifications when a blocked app is accessed"
      }
      manager.createNotificationChannel(blockedChannel)
    }
  }

  fun updateForegroundNotification() {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
    manager.notify(NOTIFICATION_ID, buildNotification())
  }

  private fun buildNotification(): Notification {
    val iconRes = resources.getIdentifier("ic_notification_ninja", "drawable", packageName)
    val smallIcon = if (iconRes != 0) iconRes else applicationInfo.icon

    val heldItems = SuppressedNotificationStore.getNotifications(this)
    val hasHeld = heldItems.isNotEmpty()

    val title = "🛡️ NeuroNinja Focus Guard"
    val text: String
    val pendingIntent: PendingIntent?

    if (hasHeld) {
      val count = heldItems.size
      val distinctApps = heldItems.map { it.appName }.distinct().size
      text = if (distinctApps <= 1) {
        val singleApp = heldItems.firstOrNull()?.appName ?: "App"
        "$count notifications held from $singleApp • Tap to review"
      } else {
        "$count notifications held across $distinctApps apps • Tap to review"
      }
      val deepLinkIntent = Intent(Intent.ACTION_VIEW, Uri.parse("neuroninja://notifications")).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      pendingIntent = PendingIntent.getActivity(
        this,
        NOTIFICATION_ID,
        deepLinkIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    } else {
      text = "Distraction shield active • Mindful barriers on"
      val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      pendingIntent = if (launchIntent != null) {
        PendingIntent.getActivity(
          this,
          NOTIFICATION_ID,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      } else null
    }

    val largeIcon = try {
      val drawable = packageManager.getApplicationIcon(packageName)
      if (drawable is android.graphics.drawable.BitmapDrawable) {
        drawable.bitmap
      } else {
        val bmp = android.graphics.Bitmap.createBitmap(
          drawable.intrinsicWidth.coerceAtLeast(48),
          drawable.intrinsicHeight.coerceAtLeast(48),
          android.graphics.Bitmap.Config.ARGB_8888
        )
        val canvas = android.graphics.Canvas(bmp)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        bmp
      }
    } catch (e: Exception) {
      null
    }

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(smallIcon)
      .setColor(android.graphics.Color.parseColor("#00E699"))
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)

    if (largeIcon != null) {
      builder.setLargeIcon(largeIcon)
    }

    if (pendingIntent != null) {
      builder.setContentIntent(pendingIntent)
    }

    return builder.build()
  }

  companion object {
    private const val TAG = "ExpoAppBlocker"
    private const val CHANNEL_ID = "expo_app_blocker_channel"
    private const val BLOCKED_CHANNEL_ID = "expo_app_blocker_blocked"
    private const val NOTIFICATION_ID = 9001
    private const val BLOCKED_NOTIFICATION_ID = 9002
    private const val POLL_INTERVAL_MS = 200L
    private const val LOOKBACK_WINDOW_MS = 10_000L
    private const val ACTION_TEMPORARY_UNLOCK = "expo.modules.appblocker.TEMPORARY_UNLOCK"
    private const val ACTION_RELOCK = "expo.modules.appblocker.RELOCK"
    private const val EXTRA_DURATION_MINUTES = "duration_minutes"

    @Volatile
    var instance: AppBlockerService? = null
      private set

    fun notifyWindowStateChanged(context: Context, packageName: String) {
      val service = instance
      if (service != null) {
        service.handleWindowStateChanged(packageName)
      } else {
        start(context)
      }
    }

    fun start(context: Context) {
      startCommand(context, Intent(context, AppBlockerService::class.java))
    }

    fun stop(context: Context) {
      val intent = Intent(context, AppBlockerService::class.java)
      context.stopService(intent)
    }

    fun temporaryUnlock(context: Context, durationMinutes: Int) {
      val intent = Intent(context, AppBlockerService::class.java).apply {
        action = ACTION_TEMPORARY_UNLOCK
        putExtra(EXTRA_DURATION_MINUTES, durationMinutes)
      }
      startCommand(context, intent)
    }

    fun relock(context: Context) {
      val intent = Intent(context, AppBlockerService::class.java).apply {
        action = ACTION_RELOCK
      }
      startCommand(context, intent)
    }

    private fun startCommand(context: Context, intent: Intent) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }
  }
}
