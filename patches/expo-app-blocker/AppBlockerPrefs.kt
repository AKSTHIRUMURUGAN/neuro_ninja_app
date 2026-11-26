package expo.modules.appblocker

import android.content.Context
import android.content.SharedPreferences
import android.os.SystemClock
import org.json.JSONArray
import org.json.JSONObject

object AppBlockerPrefs {
  const val PREFS_NAME = "expo_app_blocker_prefs"
  private const val KEY_PENDING_INTERCEPTS = "pending_intercepts"
  private const val KEY_LAST_INTERCEPT_TS = "last_intercept_ts"
  private const val INTERCEPT_DEBOUNCE_MS = 2_000L
  private const val MAX_PENDING_INTERCEPTS = 200
  const val KEY_BLOCKED_PACKAGES = "blocked_packages"
  private const val KEY_TRANSITION_GRACE_UNTIL = "transition_grace_until_ms"
  private const val KEY_PKG_UNLOCK_PREFIX = "pkg_unlock_expires_"
  private const val KEY_PKG_BUDGET_REMAINING_MS = "pkg_budget_remaining_ms_"
  private const val KEY_OVERLAY_TITLE = "overlay_title"
  private const val KEY_OVERLAY_TEXT = "overlay_text"
  private const val KEY_OVERLAY_BG_COLOR = "overlay_bg_color"
  private const val KEY_OVERLAY_TITLE_COLOR = "overlay_title_color"
  private const val KEY_OVERLAY_TEXT_COLOR = "overlay_text_color"
  private const val KEY_OVERLAY_TITLE_FONT_SIZE = "overlay_title_font_size"
  private const val KEY_OVERLAY_TEXT_FONT_SIZE = "overlay_text_font_size"
  private const val KEY_OVERLAY_TITLE_BOLD = "overlay_title_bold"
  private const val KEY_OVERLAY_PADDING = "overlay_padding"
  private const val KEY_OVERLAY_ICON_SIZE = "overlay_icon_size"
  private const val KEY_OVERLAY_ICON_GAP = "overlay_icon_gap"
  private const val KEY_OVERLAY_TITLE_GAP = "overlay_title_gap"
  private const val KEY_OVERLAY_SHOW_SPINNER = "overlay_show_spinner"
  private const val KEY_OVERLAY_SPINNER_SIZE = "overlay_spinner_size"
  private const val KEY_OVERLAY_SPINNER_GAP = "overlay_spinner_gap"
  private const val KEY_OVERLAY_SPINNER_COLOR = "overlay_spinner_color"
  private const val KEY_NOTIFICATION_TITLE = "notification_title"
  private const val KEY_NOTIFICATION_TEXT = "notification_text"

  // Floating Doomscroll HUD Keys
  private const val KEY_FLOATING_HUD_ENABLED = "floating_hud_enabled"
  private const val KEY_MONITORED_HUD_PACKAGES = "monitored_hud_packages"
  private const val KEY_DOOMSCROLL_ALERT_MINUTES = "doomscroll_alert_minutes"
  private const val KEY_DOOMSCROLL_ALERT_SCROLLS = "doomscroll_alert_scrolls"
  private const val KEY_TODAY_DOOMSCROLL_SESSIONS = "today_doomscroll_sessions"
  private const val KEY_VIP_PACKAGES = "vip_packages"
  private const val KEY_NOTIFICATION_FILTER_ENABLED = "notification_filter_enabled"
  private const val KEY_SUPPRESS_ALL_NON_VIP = "suppress_all_non_vip"

  val DEFAULT_VIP_PACKAGES = setOf(
    "com.google.android.dialer",
    "com.android.dialer",
    "com.samsung.android.dialer",
    "com.motorola.mobiledialer",
    "com.google.android.deskclock",
    "com.android.deskclock"
  )

  val DEFAULT_MONITORED_PACKAGES = setOf(
    "com.google.android.youtube",
    "com.instagram.android",
    "com.snapchat.android",
    "com.reddit.frontpage",
    "com.twitter.android",
    "com.zhiliaoapp.musically",
    "com.facebook.katana",
    "com.bytedance.tiktok"
  )

  private val NON_REEL_MESSAGING_PACKAGES = setOf(
    "com.whatsapp",
    "com.whatsapp.w4b",
    "com.facebook.orca",
    "org.telegram.messenger",
    "com.discord"
  )

  val BANKING_PACKAGES = setOf(
    "com.google.android.apps.walletnfcrel",
    "com.google.android.apps.nbu.paisa.user",
    "com.phonepe.app",
    "net.one97.paytm",
    "in.org.npci.upiapp",
    "com.sbi.lotusintouch",
    "com.icicibank.imobile",
    "com.axis.mobile",
    "com.msf.kfa",
    "com.hdfcbank.android",
    "com.csam.icici.bank.imobile",
    "com.snapwork.hdfc",
    "com.bankofbaroda.mconnect",
    "com.kotak.mbusiness",
    "com.canarabank.mobility",
    "com.freecharge.android",
    "com.mobikwik_new",
    // Indian Railways & Ticketing apps (RailOne, IRCTC)
    "org.cris.railone",
    "cris.org.in.prs.ima",
    "com.cris.icms",
    "com.irctc.air",
    // Cred, Groww, Zerodha, Slice, Jupiter
    "com.dreamplug.androidapp",
    "com.nextbillion.groww",
    "com.zerodha.kite3",
    "com.slice",
    "com.jupiter.money",
    "money.fi.app",
    "in.amazon.mShop.android.shopping"
  )

  fun get(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun getBlockedPackages(context: Context): Set<String> =
    get(context).getStringSet(KEY_BLOCKED_PACKAGES, emptySet()) ?: emptySet()

  fun setBlockedPackages(context: Context, packages: Collection<String>) {
    get(context).edit()
      .putStringSet(KEY_BLOCKED_PACKAGES, packages.toSet())
      .apply()
  }

  fun setTransitionGrace(context: Context, durationMs: Long = 15_000L) {
    val until = SystemClock.elapsedRealtime() + durationMs
    get(context).edit().putLong(KEY_TRANSITION_GRACE_UNTIL, until).commit()
  }

  fun grantPackageUnlock(context: Context, packageName: String, durationMinutes: Int) {
    if (durationMinutes <= 0) return
    val budgetMs = durationMinutes * 60_000L
    val until = SystemClock.elapsedRealtime() + budgetMs
    get(context).edit()
      .putLong(KEY_PKG_BUDGET_REMAINING_MS + packageName, budgetMs)
      .putLong(KEY_PKG_UNLOCK_PREFIX + packageName, until)
      .putLong(KEY_TRANSITION_GRACE_UNTIL, SystemClock.elapsedRealtime() + 15_000L)
      .commit()
  }

  fun consumeInAppMs(context: Context, packageName: String, elapsedMs: Long) {
    if (elapsedMs <= 0) return
    val prefs = get(context)
    val key = KEY_PKG_BUDGET_REMAINING_MS + packageName
    val current = prefs.getLong(key, -1L)
    if (current > 0) {
      val remaining = (current - elapsedMs).coerceAtLeast(0L)
      prefs.edit().putLong(key, remaining).commit()
    }
  }

  fun isPackageTemporarilyAllowed(context: Context, packageName: String): Boolean {
    val now = SystemClock.elapsedRealtime()
    val prefs = get(context)
    val graceUntil = prefs.getLong(KEY_TRANSITION_GRACE_UNTIL, 0L)
    if (now < graceUntil) return true

    val remainingMs = prefs.getLong(KEY_PKG_BUDGET_REMAINING_MS + packageName, -1L)
    if (remainingMs > 0L) return true
    if (remainingMs == 0L) return false

    val pkgUntil = prefs.getLong(KEY_PKG_UNLOCK_PREFIX + packageName, 0L)
    if (now < pkgUntil) return true

    return false
  }

  fun clearPackageUnlocks(context: Context) {
    val prefs = get(context)
    val editor = prefs.edit()
    editor.remove(KEY_TRANSITION_GRACE_UNTIL)
    for (key in prefs.all.keys) {
      if (key.startsWith(KEY_PKG_UNLOCK_PREFIX) || key.startsWith(KEY_PKG_BUDGET_REMAINING_MS)) {
        editor.remove(key)
      }
    }
    editor.commit()
  }

  /**
   * Push the overlay + notification config from JS into native prefs.
   *
   * Numeric `Float?` knobs (font sizes, paddings, icon size) are stored as
   * floats and read back through [getOverlayFloat]. Pass `null` to keep the
   * baked-in default; pass an explicit value (e.g. `28f`) to override.
   */
  fun setAndroidConfig(
    context: Context,
    overlayTitle: String?,
    overlayText: String?,
    overlayBackgroundColor: String?,
    overlayTitleColor: String?,
    overlayTextColor: String?,
    overlayTitleFontSize: Float?,
    overlayTextFontSize: Float?,
    overlayTitleBold: Boolean?,
    overlayPadding: Float?,
    overlayIconSize: Float?,
    overlayIconBottomMargin: Float?,
    overlayTitleBottomMargin: Float?,
    overlayShowSpinner: Boolean?,
    overlaySpinnerSize: Float?,
    overlaySpinnerTopMargin: Float?,
    overlaySpinnerColor: String?,
    notificationTitle: String?,
    notificationText: String?,
  ) {
    val editor = get(context).edit()
      .putString(KEY_OVERLAY_TITLE, overlayTitle)
      .putString(KEY_OVERLAY_TEXT, overlayText)
      .putString(KEY_OVERLAY_BG_COLOR, overlayBackgroundColor)
      .putString(KEY_OVERLAY_TITLE_COLOR, overlayTitleColor)
      .putString(KEY_OVERLAY_TEXT_COLOR, overlayTextColor)
      .putString(KEY_OVERLAY_SPINNER_COLOR, overlaySpinnerColor)
      .putString(KEY_NOTIFICATION_TITLE, notificationTitle)
      .putString(KEY_NOTIFICATION_TEXT, notificationText)
    putNullableFloat(editor, KEY_OVERLAY_TITLE_FONT_SIZE, overlayTitleFontSize)
    putNullableFloat(editor, KEY_OVERLAY_TEXT_FONT_SIZE, overlayTextFontSize)
    putNullableFloat(editor, KEY_OVERLAY_PADDING, overlayPadding)
    putNullableFloat(editor, KEY_OVERLAY_ICON_SIZE, overlayIconSize)
    putNullableFloat(editor, KEY_OVERLAY_ICON_GAP, overlayIconBottomMargin)
    putNullableFloat(editor, KEY_OVERLAY_TITLE_GAP, overlayTitleBottomMargin)
    putNullableFloat(editor, KEY_OVERLAY_SPINNER_SIZE, overlaySpinnerSize)
    putNullableFloat(editor, KEY_OVERLAY_SPINNER_GAP, overlaySpinnerTopMargin)
    if (overlayTitleBold != null) {
      editor.putBoolean(KEY_OVERLAY_TITLE_BOLD, overlayTitleBold)
    } else {
      editor.remove(KEY_OVERLAY_TITLE_BOLD)
    }
    if (overlayShowSpinner != null) {
      editor.putBoolean(KEY_OVERLAY_SHOW_SPINNER, overlayShowSpinner)
    } else {
      editor.remove(KEY_OVERLAY_SHOW_SPINNER)
    }
    editor.apply()
  }

  fun getOverlayTitle(context: Context): String =
    get(context).getString(KEY_OVERLAY_TITLE, null) ?: "App Blocked"

  fun getOverlayText(context: Context): String =
    get(context).getString(KEY_OVERLAY_TEXT, null) ?: "{appName} is blocked."

  fun getOverlayBackgroundColor(context: Context): String =
    get(context).getString(KEY_OVERLAY_BG_COLOR, null) ?: "#FFFFFF"

  fun getOverlayTitleColor(context: Context): String =
    get(context).getString(KEY_OVERLAY_TITLE_COLOR, null) ?: "#111111"

  fun getOverlayTextColor(context: Context): String =
    get(context).getString(KEY_OVERLAY_TEXT_COLOR, null) ?: "#737373"

  fun getOverlayTitleFontSize(context: Context): Float =
    getOverlayFloat(context, KEY_OVERLAY_TITLE_FONT_SIZE, 24f)

  fun getOverlayTextFontSize(context: Context): Float =
    getOverlayFloat(context, KEY_OVERLAY_TEXT_FONT_SIZE, 16f)

  fun getOverlayTitleBold(context: Context): Boolean =
    get(context).getBoolean(KEY_OVERLAY_TITLE_BOLD, true)

  fun getOverlayPadding(context: Context): Float =
    getOverlayFloat(context, KEY_OVERLAY_PADDING, 32f)

  fun getOverlayIconSize(context: Context): Float =
    getOverlayFloat(context, KEY_OVERLAY_ICON_SIZE, 96f)

  fun getOverlayIconBottomMargin(context: Context): Float =
    getOverlayFloat(context, KEY_OVERLAY_ICON_GAP, 20f)

  fun getOverlayTitleBottomMargin(context: Context): Float =
    getOverlayFloat(context, KEY_OVERLAY_TITLE_GAP, 12f)

  fun getOverlayShowSpinner(context: Context): Boolean =
    get(context).getBoolean(KEY_OVERLAY_SHOW_SPINNER, false)

  fun getOverlaySpinnerSize(context: Context): Float =
    getOverlayFloat(context, KEY_OVERLAY_SPINNER_SIZE, 32f)

  fun getOverlaySpinnerTopMargin(context: Context): Float =
    getOverlayFloat(context, KEY_OVERLAY_SPINNER_GAP, 24f)

  fun getOverlaySpinnerColor(context: Context): String? =
    get(context).getString(KEY_OVERLAY_SPINNER_COLOR, null)

  fun getNotificationTitle(context: Context): String =
    get(context).getString(KEY_NOTIFICATION_TITLE, null) ?: "App Blocked"

  fun getNotificationText(context: Context): String =
    get(context).getString(KEY_NOTIFICATION_TEXT, null) ?: "{appName} is blocked. Tap to manage."

  /**
   * Queue one OS-level block event for the app to drain into
   * `blocker_intercepts`. Debounced globally so the poll loop can't emit
   * duplicates for a single block, and capped to bound storage.
   */
  fun appendIntercept(context: Context, appName: String, interceptedAtMs: Long) {
    val prefs = get(context)
    val lastTs = prefs.getLong(KEY_LAST_INTERCEPT_TS, 0L)
    if (lastTs > 0L && interceptedAtMs - lastTs < INTERCEPT_DEBOUNCE_MS) return

    val arr = try {
      JSONArray(prefs.getString(KEY_PENDING_INTERCEPTS, "[]"))
    } catch (e: Exception) {
      JSONArray()
    }
    arr.put(JSONObject().put("appName", appName).put("interceptedAt", interceptedAtMs))

    val trimmed = if (arr.length() > MAX_PENDING_INTERCEPTS) {
      JSONArray().also { t ->
        for (i in (arr.length() - MAX_PENDING_INTERCEPTS) until arr.length()) t.put(arr.get(i))
      }
    } else {
      arr
    }

    prefs.edit()
      .putString(KEY_PENDING_INTERCEPTS, trimmed.toString())
      .putLong(KEY_LAST_INTERCEPT_TS, interceptedAtMs)
      .apply()
  }

  /** Return and clear the queued block events. */
  fun drainIntercepts(context: Context): List<Map<String, Any>> {
    val prefs = get(context)
    val arr = try {
      JSONArray(prefs.getString(KEY_PENDING_INTERCEPTS, "[]"))
    } catch (e: Exception) {
      JSONArray()
    }
    val out = ArrayList<Map<String, Any>>(arr.length())
    for (i in 0 until arr.length()) {
      val o = arr.getJSONObject(i)
      out.add(
        mapOf(
          "appName" to o.optString("appName", ""),
          "interceptedAt" to o.optDouble("interceptedAt"),
        )
      )
    }
    if (arr.length() > 0) prefs.edit().remove(KEY_PENDING_INTERCEPTS).apply()
    return out
  }

  private fun putNullableFloat(editor: SharedPreferences.Editor, key: String, value: Float?) {
    if (value != null) editor.putFloat(key, value) else editor.remove(key)
  }

  private fun getOverlayFloat(context: Context, key: String, fallback: Float): Float =
    if (get(context).contains(key)) get(context).getFloat(key, fallback) else fallback

  fun isFloatingHudEnabled(context: Context): Boolean =
    get(context).getBoolean(KEY_FLOATING_HUD_ENABLED, true)

  fun setFloatingHudEnabled(context: Context, enabled: Boolean) {
    get(context).edit().putBoolean(KEY_FLOATING_HUD_ENABLED, enabled).apply()
  }

  fun getMonitoredHudPackages(context: Context): Set<String> {
    val raw = get(context).getStringSet(KEY_MONITORED_HUD_PACKAGES, DEFAULT_MONITORED_PACKAGES) ?: DEFAULT_MONITORED_PACKAGES
    return raw.filter { it !in NON_REEL_MESSAGING_PACKAGES }.toSet()
  }

  fun setMonitoredHudPackages(context: Context, packages: Collection<String>) {
    get(context).edit().putStringSet(KEY_MONITORED_HUD_PACKAGES, packages.toSet()).apply()
  }

  fun getDoomscrollAlertMinutes(context: Context): Int =
    get(context).getInt(KEY_DOOMSCROLL_ALERT_MINUTES, 5)

  fun setDoomscrollAlertMinutes(context: Context, minutes: Int) {
    get(context).edit().putInt(KEY_DOOMSCROLL_ALERT_MINUTES, minutes).apply()
  }

  fun getDoomscrollAlertScrolls(context: Context): Int =
    get(context).getInt(KEY_DOOMSCROLL_ALERT_SCROLLS, 15)

  fun setDoomscrollAlertScrolls(context: Context, scrolls: Int) {
    get(context).edit().putInt(KEY_DOOMSCROLL_ALERT_SCROLLS, scrolls).apply()
  }

  fun getRemainingUnlockSeconds(context: Context, packageName: String): Long {
    val prefs = get(context)
    val remainingMs = prefs.getLong(KEY_PKG_BUDGET_REMAINING_MS + packageName, -1L)
    if (remainingMs >= 0L) {
      return remainingMs / 1000L
    }
    // Fallback to wall-clock if active budget not explicitly set
    val now = SystemClock.elapsedRealtime()
    val pkgUntil = prefs.getLong(KEY_PKG_UNLOCK_PREFIX + packageName, 0L)
    val diff = pkgUntil - now
    return if (diff > 0) diff / 1000L else 0L
  }

  fun getVipPackages(context: Context): Set<String> =
    get(context).getStringSet(KEY_VIP_PACKAGES, DEFAULT_VIP_PACKAGES) ?: DEFAULT_VIP_PACKAGES

  fun setVipPackages(context: Context, packages: Collection<String>) {
    get(context).edit().putStringSet(KEY_VIP_PACKAGES, packages.toSet()).apply()
  }

  fun isNotificationFilterEnabled(context: Context): Boolean =
    get(context).getBoolean(KEY_NOTIFICATION_FILTER_ENABLED, true)

  fun setNotificationFilterEnabled(context: Context, enabled: Boolean) {
    get(context).edit().putBoolean(KEY_NOTIFICATION_FILTER_ENABLED, enabled).apply()
  }

  fun isSuppressAllNonVip(context: Context): Boolean =
    get(context).getBoolean(KEY_SUPPRESS_ALL_NON_VIP, true) // True by default for full Regain parity!

  fun setSuppressAllNonVip(context: Context, enabled: Boolean) {
    get(context).edit().putBoolean(KEY_SUPPRESS_ALL_NON_VIP, enabled).apply()
  }

  private const val KEY_CURFEW_ENABLED = "curfew_enabled"
  private const val KEY_CURFEW_START_MINUTES = "curfew_start_minutes"
  private const val KEY_CURFEW_END_MINUTES = "curfew_end_minutes"
  private const val KEY_CURFEW_STRICT = "curfew_strict"
  private const val KEY_PARENTAL_PIN_HASH = "parental_pin_hash"

  fun isCurfewEnabled(context: Context): Boolean =
    get(context).getBoolean(KEY_CURFEW_ENABLED, true)

  fun setCurfewConfig(context: Context, enabled: Boolean, startMinutes: Int, endMinutes: Int, strict: Boolean) {
    get(context).edit()
      .putBoolean(KEY_CURFEW_ENABLED, enabled)
      .putInt(KEY_CURFEW_START_MINUTES, startMinutes)
      .putInt(KEY_CURFEW_END_MINUTES, endMinutes)
      .putBoolean(KEY_CURFEW_STRICT, strict)
      .apply()
  }

  fun getCurfewStartMinutes(context: Context): Int =
    get(context).getInt(KEY_CURFEW_START_MINUTES, 21 * 60 + 30)

  fun getCurfewEndMinutes(context: Context): Int =
    get(context).getInt(KEY_CURFEW_END_MINUTES, 6 * 60 + 30)

  fun isCurfewStrict(context: Context): Boolean =
    get(context).getBoolean(KEY_CURFEW_STRICT, true)

  fun isCurrentTimeInCurfew(context: Context): Boolean {
    if (!isCurfewEnabled(context)) return false
    val cal = java.util.Calendar.getInstance()
    val now = cal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + cal.get(java.util.Calendar.MINUTE)
    val start = getCurfewStartMinutes(context)
    val end = getCurfewEndMinutes(context)

    return if (start <= end) {
      now in start..end
    } else {
      // Overnight e.g. 21:30 (1290) to 06:30 (390)
      now >= start || now < end
    }
  }

  fun getParentalPinHash(context: Context): String =
    get(context).getString(KEY_PARENTAL_PIN_HASH, "0000") ?: "0000"

  fun setParentalPinHash(context: Context, hash: String) {
    get(context).edit().putString(KEY_PARENTAL_PIN_HASH, hash).apply()
  }

  // ─────────────────────────────────────────────────────────────
  // Reels Guardian & Surgical Short-Video Preferences
  // ─────────────────────────────────────────────────────────────
  private const val KEY_SURGICAL_REELS_BLOCK = "surgical_reels_block"
  private const val KEY_REEL_DAILY_BUDGET = "reel_daily_budget"
  private const val KEY_TODAY_REELS_COUNT = "today_reels_count"
  private const val KEY_LAST_REEL_DATE = "last_reel_date"

  fun isSurgicalReelsBlockEnabled(context: Context): Boolean =
    get(context).getBoolean(KEY_SURGICAL_REELS_BLOCK, false)

  fun setSurgicalReelsBlockEnabled(context: Context, enabled: Boolean) {
    get(context).edit().putBoolean(KEY_SURGICAL_REELS_BLOCK, enabled).apply()
  }

  fun getReelDailyBudget(context: Context): Int =
    get(context).getInt(KEY_REEL_DAILY_BUDGET, 30)

  fun setReelDailyBudget(context: Context, budget: Int) {
    get(context).edit().putInt(KEY_REEL_DAILY_BUDGET, budget).apply()
  }

  private const val KEY_REEL_HISTORY_JSON = "reel_history_json"
  private const val KEY_TODAY_INSTAGRAM_COUNT = "today_instagram_count"
  private const val KEY_TODAY_YOUTUBE_COUNT = "today_youtube_count"
  private const val KEY_TODAY_OTHER_COUNT = "today_other_count"

  private fun getTodayDateKey(): String {
    val cal = java.util.Calendar.getInstance()
    return String.format(
      java.util.Locale.US,
      "%04d-%02d-%02d",
      cal.get(java.util.Calendar.YEAR),
      cal.get(java.util.Calendar.MONTH) + 1,
      cal.get(java.util.Calendar.DAY_OF_MONTH)
    )
  }

  /**
   * Internal daily rollover engine. When date changes (midnight):
   * 1. Archives yesterday's count & platform breakdown into durable 30-day history.
   * 2. Resets today's active counter to 0.
   */
  @Synchronized
  private fun checkAndRollOverDailyCounts(context: Context, todayDate: String) {
    val prefs = get(context)
    val lastDate = prefs.getString(KEY_LAST_REEL_DATE, null) ?: return
    if (lastDate == todayDate) return

    val yesterdayTotal = prefs.getInt(KEY_TODAY_REELS_COUNT, 0)
    val yesterdayInsta = prefs.getInt(KEY_TODAY_INSTAGRAM_COUNT, 0)
    val yesterdayYt = prefs.getInt(KEY_TODAY_YOUTUBE_COUNT, 0)
    val yesterdayOther = prefs.getInt(KEY_TODAY_OTHER_COUNT, 0)

    if (yesterdayTotal > 0) {
      try {
        val historyStr = prefs.getString(KEY_REEL_HISTORY_JSON, "[]") ?: "[]"
        val historyArray = org.json.JSONArray(historyStr)
        val entry = org.json.JSONObject().apply {
          put("date", lastDate)
          put("total", yesterdayTotal)
          put("instagram", yesterdayInsta)
          put("youtube", yesterdayYt)
          put("other", yesterdayOther)
          put("timestamp", System.currentTimeMillis())
        }
        historyArray.put(entry)

        // Retain last 30 days
        val trimmedArray = org.json.JSONArray()
        val startIndex = (historyArray.length() - 30).coerceAtLeast(0)
        for (i in startIndex until historyArray.length()) {
          trimmedArray.put(historyArray.get(i))
        }

        prefs.edit().putString(KEY_REEL_HISTORY_JSON, trimmedArray.toString()).apply()
      } catch (e: Exception) {
        android.util.Log.e("AppBlockerPrefs", "Failed to archive daily history", e)
      }
    }

    // Reset today's counters to 0
    prefs.edit()
      .putString(KEY_LAST_REEL_DATE, todayDate)
      .putInt(KEY_TODAY_REELS_COUNT, 0)
      .putInt(KEY_TODAY_INSTAGRAM_COUNT, 0)
      .putInt(KEY_TODAY_YOUTUBE_COUNT, 0)
      .putInt(KEY_TODAY_OTHER_COUNT, 0)
      .apply()
  }

  fun getTodayReelsCount(context: Context): Int {
    val prefs = get(context)
    val today = getTodayDateKey()
    val lastDate = prefs.getString(KEY_LAST_REEL_DATE, null)
    if (lastDate != today) {
      checkAndRollOverDailyCounts(context, today)
      prefs.edit().putString(KEY_LAST_REEL_DATE, today).apply()
      return 0
    }
    return prefs.getInt(KEY_TODAY_REELS_COUNT, 0)
  }

  fun getTodayInstagramCount(context: Context): Int {
    val prefs = get(context)
    val today = getTodayDateKey()
    val lastDate = prefs.getString(KEY_LAST_REEL_DATE, null)
    if (lastDate != today) return 0
    return prefs.getInt(KEY_TODAY_INSTAGRAM_COUNT, 0)
  }

  fun getTodayYoutubeCount(context: Context): Int {
    val prefs = get(context)
    val today = getTodayDateKey()
    val lastDate = prefs.getString(KEY_LAST_REEL_DATE, null)
    if (lastDate != today) return 0
    return prefs.getInt(KEY_TODAY_YOUTUBE_COUNT, 0)
  }

  fun getPlatformShortCount(context: Context, packageName: String): Int {
    val prefs = get(context)
    val today = getTodayDateKey()
    val lastDate = prefs.getString(KEY_LAST_REEL_DATE, null)
    if (lastDate != today) return 0
    return when {
      packageName.contains("instagram") -> prefs.getInt(KEY_TODAY_INSTAGRAM_COUNT, 0)
      packageName.contains("youtube") -> prefs.getInt(KEY_TODAY_YOUTUBE_COUNT, 0)
      else -> prefs.getInt(KEY_TODAY_OTHER_COUNT, 0)
    }
  }

  fun getPlatformShortLabel(packageName: String, count: Int = 1): String {
    return when {
      packageName.contains("instagram") -> if (count == 1) "Reel" else "Reels"
      packageName.contains("youtube") -> if (count == 1) "Short" else "Shorts"
      packageName.contains("tiktok") || packageName.contains("musically") -> if (count == 1) "TikTok" else "TikToks"
      else -> if (count == 1) "Video" else "Videos"
    }
  }

  fun incrementTodayReelsCount(context: Context, packageName: String = ""): Int {
    val prefs = get(context)
    val today = getTodayDateKey()
    val lastDate = prefs.getString(KEY_LAST_REEL_DATE, null)
    if (lastDate != today) {
      checkAndRollOverDailyCounts(context, today)
    }

    val total = prefs.getInt(KEY_TODAY_REELS_COUNT, 0) + 1
    val editor = prefs.edit().putString(KEY_LAST_REEL_DATE, today).putInt(KEY_TODAY_REELS_COUNT, total)

    when {
      packageName.contains("instagram") -> {
        val insta = prefs.getInt(KEY_TODAY_INSTAGRAM_COUNT, 0) + 1
        editor.putInt(KEY_TODAY_INSTAGRAM_COUNT, insta)
      }
      packageName.contains("youtube") -> {
        val yt = prefs.getInt(KEY_TODAY_YOUTUBE_COUNT, 0) + 1
        editor.putInt(KEY_TODAY_YOUTUBE_COUNT, yt)
      }
      else -> {
        val other = prefs.getInt(KEY_TODAY_OTHER_COUNT, 0) + 1
        editor.putInt(KEY_TODAY_OTHER_COUNT, other)
      }
    }

    editor.apply()
    return total
  }

  fun getReelHistory(context: Context): String =
    get(context).getString(KEY_REEL_HISTORY_JSON, "[]") ?: "[]"

  fun resetTodayReelsCount(context: Context) {
    val today = getTodayDateKey()
    get(context).edit().putString(KEY_LAST_REEL_DATE, today).putInt(KEY_TODAY_REELS_COUNT, 0).apply()
  }

  fun getBrainStateScore(context: Context): Int {
    val reels = getTodayReelsCount(context)
    val budget = getReelDailyBudget(context).coerceAtLeast(10)
    // Starts at 100%, degrades linearly with reels relative to budget
    val ratio = (reels.toFloat() / budget.toFloat()).coerceIn(0f, 1f)
    return (100 - (ratio * 100f)).toInt().coerceIn(0, 100)
  }

  // ─────────────────────────────────────────────────────────────
  // Real-Money "Are You Dare" Commitment System
  // ─────────────────────────────────────────────────────────────
  private const val KEY_ACTIVE_DARE_ID = "active_dare_id"
  private const val KEY_ACTIVE_DARE_STAKE = "active_dare_stake" // in rupees e.g. 100
  private const val KEY_ACTIVE_DARE_TARGET = "active_dare_target" // e.g. 10
  private const val KEY_ACTIVE_DARE_STATUS = "active_dare_status" // "ACTIVE", "NONE", "BREACHED"
  private const val KEY_ACTIVE_DARE_TITLE = "active_dare_title"

  fun setActiveDare(context: Context, dareId: String, stakeRupees: Int, targetLimit: Int, title: String) {
    get(context).edit()
      .putString(KEY_ACTIVE_DARE_ID, dareId)
      .putInt(KEY_ACTIVE_DARE_STAKE, stakeRupees)
      .putInt(KEY_ACTIVE_DARE_TARGET, targetLimit)
      .putString(KEY_ACTIVE_DARE_STATUS, "ACTIVE")
      .putString(KEY_ACTIVE_DARE_TITLE, title)
      .apply()
  }

  fun clearActiveDare(context: Context) {
    get(context).edit()
      .putString(KEY_ACTIVE_DARE_STATUS, "NONE")
      .remove(KEY_ACTIVE_DARE_ID)
      .remove(KEY_ACTIVE_DARE_STAKE)
      .remove(KEY_ACTIVE_DARE_TARGET)
      .remove(KEY_ACTIVE_DARE_TITLE)
      .apply()
  }

  fun getActiveDareStatus(context: Context): String =
    get(context).getString(KEY_ACTIVE_DARE_STATUS, "NONE") ?: "NONE"

  fun getActiveDareStake(context: Context): Int =
    get(context).getInt(KEY_ACTIVE_DARE_STAKE, 0)

  fun getActiveDareTarget(context: Context): Int =
    get(context).getInt(KEY_ACTIVE_DARE_TARGET, 0)

  fun getActiveDareTitle(context: Context): String =
    get(context).getString(KEY_ACTIVE_DARE_TITLE, "") ?: ""

  fun getActiveDareId(context: Context): String =
    get(context).getString(KEY_ACTIVE_DARE_ID, "") ?: ""
}
