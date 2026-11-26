package expo.modules.appblocker

import android.os.Handler
import android.os.HandlerThread
import android.os.Process
import android.util.Log

class ReelDetectionWorker(
  private val serviceProvider: () -> NinjaAccessibilityService?,
  private val onReelCandidateDetected: (packageName: String, signature: ReelSignature) -> Unit,
  private val onSafeSurfaceDetected: (packageName: String) -> Unit = {},
  private val onModalStateChanged: (packageName: String, isOpen: Boolean) -> Unit = { _, _ -> }
) {
  companion object {
    private const val TAG = "ReelDetectionWorker"
    private const val SCROLL_SETTLE_DEBOUNCE_MS = 220L
    private const val WATCHER_HEARTBEAT_MS = 600L
  }

  private val thread = HandlerThread("ReelDetectionWorker", Process.THREAD_PRIORITY_BACKGROUND).apply {
    start()
  }
  private val backgroundHandler = Handler(thread.looper)

  private var pendingPackageName: String = ""
  private var isWatcherActive = false
  private var consecutiveSafeCount = 0
  private var wasModalOpen = false

  private val inspectRunnable = Runnable {
    processCurrentWindow()
  }

  private val watcherRunnable = object : Runnable {
    override fun run() {
      if (!isWatcherActive) return
      processCurrentWindow()
      if (isWatcherActive) {
        backgroundHandler.postDelayed(this, WATCHER_HEARTBEAT_MS)
      }
    }
  }

  fun scheduleInspect(packageName: String) {
    pendingPackageName = packageName
    startWatcherIfNeeded(packageName)
    backgroundHandler.removeCallbacks(inspectRunnable)
    backgroundHandler.postDelayed(inspectRunnable, SCROLL_SETTLE_DEBOUNCE_MS)
  }

  fun inspectNow(packageName: String) {
    pendingPackageName = packageName
    startWatcherIfNeeded(packageName)
    backgroundHandler.removeCallbacks(inspectRunnable)
    backgroundHandler.post(inspectRunnable)
  }

  fun startWatcherIfNeeded(packageName: String) {
    val isShortApp = packageName.contains("instagram") ||
      packageName.contains("youtube") ||
      packageName.contains("tiktok") ||
      packageName.contains("musically") ||
      packageName.contains("snapchat") ||
      packageName.contains("facebook.katana")

    if (isShortApp && !isWatcherActive) {
      isWatcherActive = true
      backgroundHandler.removeCallbacks(watcherRunnable)
      backgroundHandler.postDelayed(watcherRunnable, WATCHER_HEARTBEAT_MS)
      Log.d(TAG, "Active Watcher Heartbeat started for $packageName")
    } else if (!isShortApp && isWatcherActive) {
      stopWatcher()
    }
  }

  fun stopWatcher() {
    if (isWatcherActive) {
      isWatcherActive = false
      backgroundHandler.removeCallbacks(watcherRunnable)
      Log.d(TAG, "Active Watcher Heartbeat stopped")
    }
  }

  private fun processCurrentWindow() {
    val service = serviceProvider() ?: return
    val pkg = pendingPackageName
    if (pkg.isBlank()) return

    val root = try {
      service.rootInActiveWindow
    } catch (e: Exception) {
      Log.w(TAG, "Failed to retrieve rootInActiveWindow on worker thread", e)
      null
    } ?: return

    try {
      // 0. Modal / Comment / Share Sheet Check across ALL short-video apps
      if (ShortVideoDetector.isModalOrDrawerOpen(pkg, root)) {
        if (!wasModalOpen) {
          wasModalOpen = true
          onModalStateChanged(pkg, true)
        }
        return
      } else if (wasModalOpen) {
        wasModalOpen = false
        onModalStateChanged(pkg, false)
      }

      val isShortVideo = ShortVideoDetector.isShortVideoSurface(pkg, null, root)
      if (isShortVideo) {
        consecutiveSafeCount = 0
        val signature = ShortVideoDetector.extractReelSignature(pkg, root)
        if (signature.isValid()) {
          onReelCandidateDetected(pkg, signature)
        }
      } else {
        val isExplicitSafe = ShortVideoDetector.isExplicitSafeSurface(pkg, root)
        if (isExplicitSafe) {
          consecutiveSafeCount = 0
          stopWatcher()
          onSafeSurfaceDetected(pkg)
        } else {
          consecutiveSafeCount++
          if (consecutiveSafeCount >= 5) {
            stopWatcher()
            onSafeSurfaceDetected(pkg)
          }
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "Error processing reel window in background", e)
    } finally {
      ShortVideoDetector.recycleNode(root)
    }
  }

  fun cancelPending() {
    consecutiveSafeCount = 0
    wasModalOpen = false
    backgroundHandler.removeCallbacks(inspectRunnable)
    stopWatcher()
  }

  fun quit() {
    stopWatcher()
    backgroundHandler.removeCallbacks(inspectRunnable)
    thread.quitSafely()
  }
}
