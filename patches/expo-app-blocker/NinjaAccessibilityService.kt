package expo.modules.appblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.util.Log
import android.view.accessibility.AccessibilityEvent

class NinjaAccessibilityService : AccessibilityService() {
  companion object {
    private const val TAG = "NinjaAccessibility"
    @Volatile
    var isRunning: Boolean = false
      private set

    @Volatile
    var activeInstance: NinjaAccessibilityService? = null
      private set
  }

  private var reelTrackerEngine: ReelTrackerEngine? = null
  private var reelDetectionWorker: ReelDetectionWorker? = null
  private var surgicalReelsBlocker: SurgicalReelsBlocker? = null

  override fun onServiceConnected() {
    super.onServiceConnected()
    isRunning = true
    activeInstance = this
    Log.d(TAG, "NinjaAccessibilityService connected with Zero-Jank ReelDetectionWorker")

    try {
      val dm = resources.displayMetrics
      ShortVideoDetector.updateDisplayMetrics(dm.widthPixels, dm.heightPixels)
    } catch (e: Exception) {
      Log.w(TAG, "Could not fetch display metrics", e)
    }

    reelTrackerEngine = ReelTrackerEngine(this) { pkg, totalToday, sessionCount ->
      FloatingHudManager.recordReelWatched(pkg, totalToday, sessionCount)
    }

    reelDetectionWorker = ReelDetectionWorker(
      serviceProvider = { activeInstance },
      onReelCandidateDetected = { pkg, signature ->
        reelTrackerEngine?.onReelCandidate(pkg, signature)
      },
      onSafeSurfaceDetected = { pkg ->
        reelTrackerEngine?.cancelPendingDwell()
      }
    )

    surgicalReelsBlocker = SurgicalReelsBlocker(this)

    // Ultra-smooth zero-jank config: NEVER listen to TYPE_WINDOW_CONTENT_CHANGED to avoid IPC lag
    serviceInfo = serviceInfo.apply {
      eventTypes = AccessibilityEvent.TYPE_VIEW_SCROLLED or
        AccessibilityEvent.TYPE_VIEW_SELECTED or
        AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
      feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
      notificationTimeout = 100
      flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
      packageNames = getMonitoredPackages()
    }
  }

  fun getMonitoredPackages(): Array<String> {
    val result = mutableSetOf<String>()
    result.addAll(AppBlockerPrefs.DEFAULT_MONITORED_PACKAGES)
    result.addAll(AppBlockerPrefs.getMonitoredHudPackages(this))
    result.addAll(AppBlockerPrefs.getBlockedPackages(this))
    result.add(packageName)
    // Exclude any banking or financial packages
    return result.filter { !PaymentAppSecurityController.isBankingApp(it) }.toTypedArray()
  }

  private var lastMonitoredPackage: String? = null

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    val pkg = event.packageName?.toString() ?: return

    // 0. Intercept our own app: ONLY hide floating HUD if user actually opened our full MainActivity screen
    if (pkg == packageName || pkg.contains("neuroninja") || pkg == "com.neuroninja.app") {
      val isRealActivity = event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
        (event.className?.toString()?.contains("MainActivity") == true || AppForegroundTracker.isMainActivityResumed)
      if (isRealActivity) {
        FloatingHudManager.instance?.hide()
        OverlayManager.instance?.hide()
        if (lastMonitoredPackage != null) {
          reelTrackerEngine?.resetSession(lastMonitoredPackage ?: pkg)
          reelDetectionWorker?.cancelPending()
          lastMonitoredPackage = null
        }
        AppBlockerService.notifyWindowStateChanged(this, packageName)
      }
      return
    }

    // 0b. Banking & Financial Apps 0ms Immediate Bypass & Safety Intercept
    if (PaymentAppSecurityController.isBankingApp(pkg)) {
      FloatingHudManager.instance?.hide()
      OverlayManager.instance?.hide()
      if (lastMonitoredPackage != null) {
        reelTrackerEngine?.resetSession(lastMonitoredPackage ?: pkg)
        reelDetectionWorker?.cancelPending()
        lastMonitoredPackage = null
      }
      PaymentAppSecurityController.onBankingAppForeground(this, pkg)
      return
    }

    // 0c. Transient OS components (System UI, Keyboards, Autofill, Volume panels, Dialogs)
    if (pkg == "android" || pkg.contains("systemui") || pkg.contains("inputmethod") || pkg.contains("autofill")) {
      return
    }

    val monitored = AppBlockerPrefs.getMonitoredHudPackages(this)
    val isCandidateApp = pkg in monitored ||
      pkg in AppBlockerPrefs.DEFAULT_MONITORED_PACKAGES ||
      pkg.contains("youtube") ||
      pkg.contains("instagram") ||
      pkg.contains("tiktok") ||
      pkg.contains("musically") ||
      pkg.contains("snapchat") ||
      pkg.contains("facebook")

    if (!isCandidateApp) {
      if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
        if (lastMonitoredPackage != null) {
          reelTrackerEngine?.resetSession(lastMonitoredPackage ?: pkg)
          FloatingHudManager.instance?.resetSession(lastMonitoredPackage ?: pkg)
          reelDetectionWorker?.cancelPending()
          lastMonitoredPackage = null
        }
        AppBlockerService.notifyWindowStateChanged(this, pkg)
      }
      return
    }

    lastMonitoredPackage = pkg

    if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      AppBlockerService.notifyWindowStateChanged(this, pkg)
    }

    // 1. Surgical Reels / Shorts auto-block check
    if (AppBlockerPrefs.isSurgicalReelsBlockEnabled(this)) {
      surgicalReelsBlocker?.interceptShortVideo(pkg)
      return
    }

    // 2. Event Routing
    when (event.eventType) {
      AccessibilityEvent.TYPE_VIEW_SCROLLED -> {
        val source = try { event.source } catch (_: Exception) { null }
        val sourceId = source?.viewIdResourceName?.lowercase() ?: ""
        val sourceClass = event.className?.toString()?.lowercase() ?: ""
        ShortVideoDetector.recycleNode(source)

        val isShortScroll = when {
          pkg.contains("youtube") -> {
            // Strictly require reel_recycler or shorts container for YouTube
            sourceId.contains("reel_recycler") || sourceId.contains("shorts_recycler") ||
              (sourceId.contains("reel") && !sourceId.contains("time_bar"))
          }
          pkg.contains("instagram") -> {
            // Reject Direct Messages, Chat Threads, Notifications, Feed posts, DMs
            if (sourceId.contains("direct") || sourceId.contains("thread") ||
              sourceId.contains("message") || sourceId.contains("inbox") ||
              sourceId.contains("row_feed") || sourceId.contains("composer")
            ) {
              false
            } else {
              val root = try { rootInActiveWindow } catch (_: Exception) { null }
              val isCommentsOpen = ShortVideoDetector.isInstagramCommentSheetActive(root)
              val isReelsActive = ShortVideoDetector.activeShortVideoPackage == pkg ||
                ShortVideoDetector.hasInstagramReelIndicators(root, pkg)
              ShortVideoDetector.recycleNode(root)
              if (isCommentsOpen) {
                false
              } else {
                sourceId.contains("clips") || sourceId.contains("reel") ||
                  sourceClass.contains("viewpager") || sourceClass.contains("recyclerview") ||
                  sourceClass.contains("compose") || sourceClass.contains("componenthost") ||
                  isReelsActive
              }
            }
          }
          else -> true
        }

        if (isShortScroll) {
          reelTrackerEngine?.onPhysicalScroll(pkg)
          reelDetectionWorker?.scheduleInspect(pkg)
        } else {
          // Normal feed/DM/comment scroll: only inspect if not confirmed safe/comment surface
          val root = try { rootInActiveWindow } catch (_: Exception) { null }
          val isSafe = ShortVideoDetector.isExplicitSafeSurface(pkg, root)
          ShortVideoDetector.recycleNode(root)
          if (!isSafe) {
            reelDetectionWorker?.scheduleInspect(pkg)
          }
        }
      }

      AccessibilityEvent.TYPE_VIEW_SELECTED -> {
        // Media player tick / item selection: inspect settled content WITHOUT canceling dwell timer
        reelDetectionWorker?.scheduleInspect(pkg)
      }

      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
        AppBlockerService.notifyWindowStateChanged(this, pkg)
        // Inspect settled window immediately on background thread
        reelDetectionWorker?.inspectNow(pkg)
      }
    }
  }

  override fun onInterrupt() {
    Log.d(TAG, "NinjaAccessibilityService interrupted")
  }

  override fun onDestroy() {
    super.onDestroy()
    isRunning = false
    activeInstance = null
    try {
      reelDetectionWorker?.quit()
    } catch (e: Exception) {
      Log.w(TAG, "Error quitting reelDetectionWorker", e)
    }
    reelDetectionWorker = null
    reelTrackerEngine = null
    surgicalReelsBlocker = null
    Log.d(TAG, "NinjaAccessibilityService destroyed")
  }
}
