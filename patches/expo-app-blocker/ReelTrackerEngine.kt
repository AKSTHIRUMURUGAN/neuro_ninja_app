package expo.modules.appblocker

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log

class ReelTrackerEngine(
  private val context: Context,
  private val onReelCommitted: (packageName: String, totalToday: Int, sessionCount: Int) -> Unit
) {
  companion object {
    private const val TAG = "ReelTrackerEngine"
    private const val MIN_DWELL_MS = 1000L
    private const val REEL_COMMIT_DEBOUNCE_MS = 800L
    private const val SCROLL_DEBOUNCE_MS = 500L
    private const val MODAL_RESUME_COOLDOWN_MS = 900L
    private const val LRU_CACHE_SIZE = 12
  }

  private val handler = Handler(Looper.getMainLooper())
  private var currentSignature: ReelSignature? = null
  private var pendingSignature: ReelSignature? = null
  private var pendingPackageName: String = ""
  private var lastCommitTimeMs: Long = 0L
  private var sessionCount: Int = 0
  private var dwellStartTimeMs: Long = 0L
  private var lastPhysicalScrollTimeMs: Long = 0L
  private var isPendingDwellActive: Boolean = false
  private var hasPendingSwipeTransition: Boolean = false
  private var swipeCounter: Long = 0L

  private var isPausedInModal: Boolean = false
  private var lastModalClosedTimeMs: Long = 0L
  private val recentSignatures = ArrayDeque<ReelSignature>()

  private val dwellRunnable = Runnable {
    checkAndCommitDwell()
  }

  fun onModalOpened(packageName: String) {
    if (!isPausedInModal) {
      Log.d(TAG, "Entering PAUSED_MODAL state in $packageName (comments/share/sheet open)")
    }
    isPausedInModal = true
    hasPendingSwipeTransition = false
    handler.removeCallbacks(dwellRunnable)
    pendingSignature = null
    isPendingDwellActive = false
  }

  fun onModalClosed(packageName: String) {
    if (isPausedInModal) {
      Log.d(TAG, "Exiting PAUSED_MODAL state in $packageName -> deduplicating resumed reel")
      isPausedInModal = false
      hasPendingSwipeTransition = false
      lastModalClosedTimeMs = SystemClock.elapsedRealtime()
    }
  }

  fun onPhysicalScroll(packageName: String) {
    if (isPausedInModal) {
      return
    }
    val now = SystemClock.elapsedRealtime()
    if (now - lastPhysicalScrollTimeMs < SCROLL_DEBOUNCE_MS) {
      return
    }
    lastPhysicalScrollTimeMs = now
    hasPendingSwipeTransition = true
    Log.d(TAG, "Physical swipe gesture detected in $packageName")

    if (isPendingDwellActive && pendingSignature != null) {
      val dwell = now - dwellStartTimeMs
      if (dwell >= MIN_DWELL_MS && (now - lastCommitTimeMs >= REEL_COMMIT_DEBOUNCE_MS)) {
        handler.removeCallbacks(dwellRunnable)
        checkAndCommitDwell()
      }
    }
  }

  fun onScrollGesture(packageName: String) {
    onPhysicalScroll(packageName)
  }

  private fun isRecentlySeen(signature: ReelSignature): Boolean {
    if (currentSignature != null && !signature.isDifferentFrom(currentSignature)) {
      return true
    }
    return recentSignatures.any { !signature.isDifferentFrom(it) }
  }

  fun onReelCandidate(packageName: String, signature: ReelSignature) {
    if (!signature.isValid() || isPausedInModal) return
    val now = SystemClock.elapsedRealtime()
    val inModalCooldown = (now - lastModalClosedTimeMs) < MODAL_RESUME_COOLDOWN_MS
    val isSwipeAdvance = !inModalCooldown && hasPendingSwipeTransition && (now - lastPhysicalScrollTimeMs < 4000L)

    // 1. If identical to current or recently watched reel (e.g. returned from Comments/Share), ignore!
    if (!isSwipeAdvance && isRecentlySeen(signature)) {
      return
    }

    // 2. If identical to currently pending reel
    if (!isSwipeAdvance && pendingSignature != null && !signature.isDifferentFrom(pendingSignature)) {
      if (!isPendingDwellActive) {
        isPendingDwellActive = true
        val elapsed = now - dwellStartTimeMs
        val remaining = (MIN_DWELL_MS - elapsed).coerceAtLeast(150L)
        handler.removeCallbacks(dwellRunnable)
        handler.postDelayed(dwellRunnable, remaining)
      }
      return
    }

    hasPendingSwipeTransition = false

    val effectiveSig = if (isSwipeAdvance && signature.author.isBlank() && signature.captionPrefix.isBlank()) {
      signature.copy(containerKey = "${signature.containerKey}_#${++swipeCounter}")
    } else {
      signature
    }

    if (!isSwipeAdvance && isRecentlySeen(effectiveSig)) {
      return
    }

    Log.d(
      TAG,
      "New Reel Candidate in Viewport: author='${effectiveSig.author}', caption='${effectiveSig.captionPrefix}', container='${effectiveSig.containerKey}'"
    )

    if (isPendingDwellActive && pendingSignature != null) {
      val dwell = now - dwellStartTimeMs
      if (dwell >= MIN_DWELL_MS && (now - lastCommitTimeMs >= REEL_COMMIT_DEBOUNCE_MS)) {
        checkAndCommitDwell()
      }
    }

    handler.removeCallbacks(dwellRunnable)
    pendingSignature = effectiveSig
    pendingPackageName = packageName
    dwellStartTimeMs = now
    isPendingDwellActive = true

    handler.postDelayed(dwellRunnable, MIN_DWELL_MS)
  }

  private fun checkAndCommitDwell() {
    if (isPausedInModal) return
    val sig = pendingSignature ?: return
    val pkg = pendingPackageName
    val now = SystemClock.elapsedRealtime()

    val elapsed = now - dwellStartTimeMs
    if (elapsed < MIN_DWELL_MS) {
      val remaining = (MIN_DWELL_MS - elapsed).coerceAtLeast(150L)
      handler.postDelayed(dwellRunnable, remaining)
      return
    }

    if (now - lastCommitTimeMs < REEL_COMMIT_DEBOUNCE_MS) {
      Log.d(TAG, "Reel commit debounced: fired too rapidly after last commit")
      return
    }

    if (isRecentlySeen(sig)) {
      pendingSignature = null
      isPendingDwellActive = false
      return
    }

    currentSignature = sig
    recentSignatures.addLast(sig)
    while (recentSignatures.size > LRU_CACHE_SIZE) {
      recentSignatures.removeFirst()
    }

    pendingSignature = null
    isPendingDwellActive = false
    lastCommitTimeMs = now
    sessionCount++

    val totalToday = AppBlockerPrefs.incrementTodayReelsCount(context, pkg)
    val dwellTime = now - dwellStartTimeMs

    Log.i(
      TAG,
      "REEL COMMITTED! Today: $totalToday, Session: $sessionCount, Dwell: ${dwellTime}ms [Author: ${sig.author}, Key: ${sig.containerKey}]"
    )

    onReelCommitted(pkg, totalToday, sessionCount)
  }

  fun cancelPendingDwell() {
    handler.removeCallbacks(dwellRunnable)
    pendingSignature = null
    isPendingDwellActive = false
    hasPendingSwipeTransition = false
  }

  fun resetSession(packageName: String) {
    Log.d(TAG, "Resetting session for $packageName (Left short-video surface)")
    handler.removeCallbacks(dwellRunnable)
    pendingSignature = null
    currentSignature = null
    recentSignatures.clear()
    isPendingDwellActive = false
    hasPendingSwipeTransition = false
    isPausedInModal = false
    sessionCount = 0
  }

  fun getSessionCount(): Int = sessionCount
}
