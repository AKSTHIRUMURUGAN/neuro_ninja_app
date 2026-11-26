package expo.modules.appblocker

import android.graphics.Rect
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

data class ReelSignature(
  val author: String = "",
  val captionPrefix: String = "",
  val audioOrDesc: String = "",
  val containerKey: String = "",
  val timestampMs: Long = SystemClock.elapsedRealtime()
) {
  fun isValid(): Boolean =
    author.isNotBlank() || captionPrefix.isNotBlank() || audioOrDesc.isNotBlank() || containerKey.isNotBlank()

  fun isDifferentFrom(other: ReelSignature?): Boolean {
    if (other == null) return true

    if (author.isNotBlank() && other.author.isNotBlank() &&
      !author.equals(other.author, ignoreCase = true)
    ) {
      return true
    }

    if (captionPrefix.isNotBlank() && other.captionPrefix.isNotBlank() &&
      !captionPrefix.equals(other.captionPrefix, ignoreCase = true)
    ) {
      return true
    }

    if (audioOrDesc.isNotBlank() && other.audioOrDesc.isNotBlank() &&
      !audioOrDesc.equals(other.audioOrDesc, ignoreCase = true)
    ) {
      return true
    }

    if (author.isBlank() && other.author.isBlank() &&
      captionPrefix.isBlank() && other.captionPrefix.isBlank() &&
      containerKey.isNotBlank() && other.containerKey.isNotBlank() &&
      containerKey != other.containerKey
    ) {
      return true
    }

    if ((author.isNotBlank() && other.author.isBlank()) || (author.isBlank() && other.author.isNotBlank())) {
      return true
    }

    return false
  }
}

object ShortVideoDetector {
  private const val TAG = "ShortVideoDetector"
  private const val MAX_DEEP_DEPTH = 25
  private const val MODAL_SCAN_DEPTH = 14

  @Volatile
  var screenWidth: Int = 1080
  @Volatile
  var screenHeight: Int = 2400

  @Volatile
  var activeShortVideoPackage: String? = null

  fun updateDisplayMetrics(width: Int, height: Int) {
    if (width > 0) screenWidth = width
    if (height > 0) screenHeight = height
    Log.d(TAG, "Display metrics updated: ${screenWidth}x$screenHeight")
  }

  private val INSTAGRAM_DIRECT_CONTAINER_IDS = listOf(
    "clips_viewer_pager",
    "clips_video_container",
    "reel_viewer_root",
    "reel_viewer_content_layout",
    "reel_viewer_media_container",
    "reel_item_toolbar_container",
    "viewer_reel_item_toolbar_container",
    "clips_viewer",
    "clips_tab"
  )

  private val INSTAGRAM_REELS_AUTHOR_IDS = listOf(
    "reel_viewer_title_row_compose",
    "clips_author_name",
    "username",
    "reel_viewer_profile_picture",
    "clips_profile_picture"
  )

  private val INSTAGRAM_REELS_CAPTION_IDS = listOf(
    "media_subtitle",
    "reel_viewer_text_container",
    "media_caption",
    "clips_caption"
  )

  private val INSTAGRAM_AUDIO_IDS = listOf(
    "reel_app_attribution_action_text",
    "audio_sound_wave",
    "music_title"
  )

  private val INSTAGRAM_SAFE_INDICATORS = listOf(
    "direct_thread_layout",
    "direct_inbox_header",
    "direct_text_message",
    "row_inbox",
    "direct_message_list",
    "profile_tab_container",
    "direct_tab",
    "direct_thread",
    "direct_inbox",
    "direct_message",
    "thread_title",
    "composer_edittext",
    "direct_recipient_pills_container",
    "direct_thread_feed_recycler_view",
    "action_bar_search_edit_text",
    "thread_composer",
    "direct_chat",
    "direct_unified",
    "newsfeed_you",
    "notification_center",
    "row_newsfeed",
    "row_inbox_container",
    "direct_visual_message_viewer",
    "direct_voice_message_cell",
    "reel_viewer_story_container",
    "stories_tray"
  )

  // Explicit list/sheet containers inside Instagram Comments or Share sheets
  private val INSTAGRAM_MODAL_LIST_IDS = listOf(
    "comments_recycler_view",
    "layout_comment_thread",
    "comment_rows",
    "comments_list",
    "sharesheet_recycler_view",
    "direct_share_sheet",
    "likes_list_recycler_view"
  )

  private val INSTAGRAM_MODAL_SHEET_IDS = listOf(
    "bottom_sheet_container",
    "igds_bottom_sheet_layout",
    "igds_bottom_sheet",
    "modal_sheet",
    "share_sheet_container",
    "comment_sheet"
  )

  private val YOUTUBE_SHORTS_DIRECT_IDS = listOf(
    "reel_watch_fragment_root",
    "reel_recycler",
    "reel_player_page_container",
    "reel_player_overlay_root",
    "reel_player_overlay_container",
    "reel_video_interactions",
    "reel_player_footer_container",
    "reel_scrim_shorts_while_bottom_gradient",
    "shorts_container",
    "reel_player_view",
    "shorts_player_view",
    "reel_watch_fragment"
  )

  private val YOUTUBE_AUTHOR_IDS = listOf(
    "channel_name",
    "reel_channel_name"
  )

  private val YOUTUBE_CAPTION_IDS = listOf(
    "video_title",
    "reel_main_title"
  )

  // NOTE: YouTube keeps engagement_panel_wrapper / bottom_sheet_container pre-mounted in the tree;
  // only treat YouTube modals as open when comment-sheet / share-sheet content is actually visible.
  private val YOUTUBE_MODAL_SHEET_IDS = listOf(
    "share_sheet_container"
  )

  private val YOUTUBE_SAFE_INDICATORS = listOf(
    "browse_fragment_layout_coordinator_layout",
    "pane_fragment_container",
    "results_recycler",
    "watch_while_layout",
    "search_edit_text",
    "feed_filter_bar",
    "channel_header"
  )

  private val SNAPCHAT_SAFE_INDICATORS = listOf(
    "chat_input_text_field",
    "chat_message_list",
    "friends_feed_recycler_view",
    "chat_list",
    "conversation_container",
    "camera_preview",
    "map_container",
    "memories_grid"
  )

  // Strong multi-signal modal cues (never single player buttons like "Send to", "Add a comment", or "Comments")
  private val STRONG_COMMENT_SHEET_CUES = setOf(
    "no comments yet",
    "top comments",
    "newest first",
    "view replies",
    "timed"
  )

  private val STRONG_SHARE_SHEET_CUES = setOf(
    "copy link",
    "add to story",
    "send in messenger",
    "share to"
  )

  private val CHROME_STOPWORDS = setOf(
    "shorts",
    "reels",
    "follow",
    "following",
    "subscribe",
    "subscribed",
    "like",
    "dislike",
    "comment",
    "comments",
    "share",
    "send to",
    "remix",
    "sound",
    "original audio",
    "home",
    "subscriptions",
    "you",
    "library",
    "search",
    "interested",
    "not interested"
  )

  fun isInstagramCommentSheetActive(rootNode: AccessibilityNodeInfo?): Boolean =
    isModalOrDrawerOpen("com.instagram.android", rootNode)

  private fun hasLargeVisibleViewId(
    root: AccessibilityNodeInfo?,
    packageName: String,
    viewIds: List<String>,
    minHeightRatio: Float
  ): Boolean {
    if (root == null) return false
    val minHeight = (screenHeight * minHeightRatio).toInt()
    val rect = Rect()
    for (id in viewIds) {
      val found = root.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
      if (!found.isNullOrEmpty()) {
        for (node in found) {
          if (node.isVisibleToUser) {
            node.getBoundsInScreen(rect)
            if (rect.height() >= minHeight) {
              recycleNodes(found)
              return true
            }
          }
        }
        recycleNodes(found)
      }
    }
    return false
  }

  /**
   * Fast O(1)-ish view-ID + geometric check safe for main-thread TYPE_VIEW_SCROLLED.
   */
  fun isFastModalActive(packageName: String, rootNode: AccessibilityNodeInfo?): Boolean {
    if (rootNode == null) return false
    return when {
      packageName.contains("instagram") -> {
        hasLargeVisibleViewId(rootNode, packageName, INSTAGRAM_MODAL_LIST_IDS, 0.20f) ||
          hasLargeVisibleViewId(rootNode, packageName, INSTAGRAM_MODAL_SHEET_IDS, 0.28f)
      }
      packageName.contains("youtube") -> {
        hasLargeVisibleViewId(rootNode, packageName, YOUTUBE_MODAL_SHEET_IDS, 0.28f)
      }
      else -> false
    }
  }

  /**
   * Unified Modal / Bottom-Sheet / Comments / Share-Sheet Suppression (Mindful & NoScroll parity).
   * Requires geometric sheet bounds (>= 28% screen height) OR 2+ simultaneous modal cues
   * so normal Reels/Shorts player buttons ("Send to", comment teaser) NEVER false-trigger.
   */
  fun isModalOrDrawerOpen(packageName: String, rootNode: AccessibilityNodeInfo?): Boolean {
    if (rootNode == null) return false
    if (isFastModalActive(packageName, rootNode)) return true

    val rect = Rect()
    val minSheetHeight = (screenHeight * 0.28f).toInt()
    var hasLargeSheetId = false
    var commentCueCount = 0
    var shareCueCount = 0
    var hasCommentInput = false
    val seenCues = HashSet<String>()

    fun scanModalMarkers(node: AccessibilityNodeInfo?, depth: Int) {
      if (node == null || depth > MODAL_SCAN_DEPTH || hasLargeSheetId) return
      val resId = node.viewIdResourceName?.lowercase() ?: ""
      if (!packageName.contains("youtube") && (
          resId.contains("bottom_sheet") ||
          resId.contains("comments_recycler") ||
          resId.contains("sharesheet") ||
          resId.contains("direct_share_sheet")
        )
      ) {
        if (node.isVisibleToUser) {
          node.getBoundsInScreen(rect)
          if (rect.height() >= minSheetHeight) {
            hasLargeSheetId = true
            return
          }
        }
      }

      val text = node.text?.toString()?.lowercase()?.trim() ?: ""
      val desc = node.contentDescription?.toString()?.lowercase()?.trim() ?: ""
      val combined = if (text.isNotEmpty()) text else desc

      if (combined.isNotEmpty() && node.isVisibleToUser) {
        if (combined.contains("add a comment") || combined.contains("add comment") || combined.contains("write a comment")) {
          hasCommentInput = true
        }
        for (cue in STRONG_COMMENT_SHEET_CUES) {
          if ((combined == cue || combined.startsWith(cue)) && seenCues.add("c:$cue")) {
            commentCueCount++
          }
        }
        for (cue in STRONG_SHARE_SHEET_CUES) {
          if (combined.contains(cue) && seenCues.add("s:$cue")) {
            shareCueCount++
          }
        }
        if (combined == "send to" && seenCues.add("s:send_to")) {
          shareCueCount++
        }
      }

      if (commentCueCount >= 2 || (hasCommentInput && commentCueCount >= 1) || shareCueCount >= 2) {
        return
      }

      for (i in 0 until node.childCount) {
        val child = node.getChild(i) ?: continue
        scanModalMarkers(child, depth + 1)
        recycleNode(child)
        if (hasLargeSheetId || commentCueCount >= 2 || (hasCommentInput && commentCueCount >= 1) || shareCueCount >= 2) {
          return
        }
      }
    }

    scanModalMarkers(rootNode, 0)
    return hasLargeSheetId ||
      commentCueCount >= 2 ||
      (hasCommentInput && commentCueCount >= 1) ||
      shareCueCount >= 2
  }

  fun recycleNode(node: AccessibilityNodeInfo?) {
    if (node == null) return
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      try {
        @Suppress("DEPRECATION")
        node.recycle()
      } catch (_: Exception) {}
    }
  }

  fun recycleNodes(nodes: List<AccessibilityNodeInfo>?) {
    if (nodes == null) return
    for (n in nodes) {
      recycleNode(n)
    }
  }

  private fun selectCenterViewportNode(nodes: List<AccessibilityNodeInfo>): Pair<AccessibilityNodeInfo?, Rect?> {
    if (nodes.isEmpty()) return Pair(null, null)

    val centerY = screenHeight / 2
    var bestNode: AccessibilityNodeInfo? = null
    var bestRect: Rect? = null
    var minDistanceToCenter = Int.MAX_VALUE
    val tempRect = Rect()

    for (node in nodes) {
      node.getBoundsInScreen(tempRect)
      if (tempRect.bottom <= 0 || tempRect.top >= screenHeight) continue
      if (tempRect.width() <= 0 || tempRect.height() <= 0) continue

      val dist = kotlin.math.abs(tempRect.centerY() - centerY)
      if (dist < minDistanceToCenter) {
        minDistanceToCenter = dist
        bestNode = node
        bestRect = Rect(tempRect)
      }
    }

    return Pair(bestNode, bestRect)
  }

  fun hasInstagramReelIndicators(rootNode: AccessibilityNodeInfo?, packageName: String): Boolean {
    if (rootNode == null) return false
    return hasAnyDirectViewId(rootNode, packageName, INSTAGRAM_DIRECT_CONTAINER_IDS) ||
      hasAnyDirectViewId(rootNode, packageName, INSTAGRAM_REELS_AUTHOR_IDS) ||
      hasAnyDirectViewId(rootNode, packageName, INSTAGRAM_REELS_CAPTION_IDS) ||
      hasAnyDirectViewId(rootNode, packageName, INSTAGRAM_AUDIO_IDS)
  }

  private fun isSnapchatSpotlightActive(rootNode: AccessibilityNodeInfo?, packageName: String): Boolean {
    if (rootNode == null) return false
    if (hasAnyDirectViewId(rootNode, packageName, SNAPCHAT_SAFE_INDICATORS)) return false

    var hasChatOrSafeUi = false
    var hasSpotlightSignal = false
    val rect = Rect()

    fun scanSnap(node: AccessibilityNodeInfo?, depth: Int) {
      if (node == null || depth > 14 || hasChatOrSafeUi) return
      val resId = node.viewIdResourceName?.lowercase() ?: ""
      val text = node.text?.toString()?.lowercase()?.trim() ?: ""
      val desc = node.contentDescription?.toString()?.lowercase()?.trim() ?: ""

      if (resId.contains("chat") || resId.contains("friends_feed") || resId.contains("conversation") ||
        resId.contains("map") || resId.contains("memories") ||
        text == "send a chat" || text == "new chat" || text == "chats" || text == "my ai"
      ) {
        hasChatOrSafeUi = true
        return
      }

      if (resId.contains("spotlight") || desc.contains("spotlight") || text == "spotlight") {
        node.getBoundsInScreen(rect)
        if (node.isVisibleToUser && rect.height() > 0) {
          hasSpotlightSignal = true
        }
      }

      for (i in 0 until node.childCount) {
        val child = node.getChild(i) ?: continue
        scanSnap(child, depth + 1)
        recycleNode(child)
        if (hasChatOrSafeUi) return
      }
    }

    scanSnap(rootNode, 0)
    return hasSpotlightSignal && !hasChatOrSafeUi
  }

  private fun isFacebookReelsActive(rootNode: AccessibilityNodeInfo?, packageName: String): Boolean {
    if (rootNode == null) return false
    var hasReelsSignal = false
    val rect = Rect()

    fun scanFb(node: AccessibilityNodeInfo?, depth: Int) {
      if (node == null || depth > 14 || hasReelsSignal) return
      val resId = node.viewIdResourceName?.lowercase() ?: ""
      val desc = node.contentDescription?.toString()?.lowercase()?.trim() ?: ""
      if (resId.contains("reels") || resId.contains("fb_shorts") || desc.contains("reels")) {
        node.getBoundsInScreen(rect)
        if (node.isVisibleToUser && rect.height() >= (screenHeight * 0.65f).toInt()) {
          hasReelsSignal = true
          return
        }
      }
      for (i in 0 until node.childCount) {
        val child = node.getChild(i) ?: continue
        scanFb(child, depth + 1)
        recycleNode(child)
        if (hasReelsSignal) return
      }
    }

    scanFb(rootNode, 0)
    return hasReelsSignal
  }

  /**
   * Validates physical scroll gestures on the main thread without expensive deep scans.
   * Supports Compose, Litho ComponentHost, and ViewPager2 inner RecyclerViews.
   */
  fun isValidShortVideoScroll(
    packageName: String,
    sourceNode: AccessibilityNodeInfo?,
    eventClassName: String,
    rootNode: AccessibilityNodeInfo?
  ): Boolean {
    if (isFastModalActive(packageName, rootNode) || isExplicitSafeSurface(packageName, rootNode)) {
      return false
    }

    val sourceId = sourceNode?.viewIdResourceName?.lowercase() ?: ""
    val sourceClass = (sourceNode?.className?.toString() ?: eventClassName).lowercase()

    if (sourceId.contains("direct") || sourceId.contains("thread") ||
      sourceId.contains("message") || sourceId.contains("inbox") ||
      sourceId.contains("row_feed") || sourceId.contains("composer") ||
      sourceId.contains("comment") || sourceId.contains("share") ||
      sourceId.contains("time_bar")
    ) {
      return false
    }

    if (sourceNode != null) {
      val rect = Rect()
      sourceNode.getBoundsInScreen(rect)
      if (rect.height() in 1 until (screenHeight * 0.45f).toInt()) {
        return false
      }
    }

    return when {
      packageName.contains("youtube") -> {
        hasActiveShortsViewport(rootNode, packageName) &&
          (sourceId.contains("reel") || sourceId.contains("shorts") ||
            sourceClass.contains("recyclerview") || sourceClass.contains("viewpager"))
      }
      packageName.contains("instagram") -> {
        val isReelsActive = activeShortVideoPackage == packageName ||
          hasInstagramReelIndicators(rootNode, packageName)
        isReelsActive && (sourceId.contains("clips") || sourceId.contains("reel") ||
          sourceClass.contains("viewpager") || sourceClass.contains("recyclerview") ||
          sourceClass.contains("compose") || sourceClass.contains("componenthost"))
      }
      packageName.contains("zhiliaoapp.musically") || packageName.contains("tiktok") -> true
      packageName.contains("snapchat") -> isSnapchatSpotlightActive(rootNode, packageName)
      packageName.contains("facebook.katana") -> isFacebookReelsActive(rootNode, packageName)
      else -> false
    }
  }

  fun isShortVideoSurface(
    packageName: String,
    event: AccessibilityEvent?,
    rootNode: AccessibilityNodeInfo?
  ): Boolean {
    if (isModalOrDrawerOpen(packageName, rootNode)) {
      return false
    }

    val className = event?.className?.toString()?.lowercase() ?: ""

    return when {
      packageName.contains("instagram") -> {
        if (hasAnyDirectViewId(rootNode, packageName, INSTAGRAM_SAFE_INDICATORS)) {
          activeShortVideoPackage = null
          return false
        }
        if (hasInstagramReelIndicators(rootNode, packageName) ||
          className.contains("clips") || className.contains("reel")
        ) {
          activeShortVideoPackage = packageName
          true
        } else {
          activeShortVideoPackage = null
          false
        }
      }

      packageName.contains("youtube") -> {
        val hasActiveShorts = hasActiveShortsViewport(rootNode, packageName)
        activeShortVideoPackage = if (hasActiveShorts) packageName else null
        hasActiveShorts
      }

      packageName.contains("zhiliaoapp.musically") || packageName.contains("tiktok") -> {
        activeShortVideoPackage = packageName
        true
      }

      packageName.contains("snapchat") -> {
        val active = isSnapchatSpotlightActive(rootNode, packageName)
        activeShortVideoPackage = if (active) packageName else null
        active
      }

      packageName.contains("facebook.katana") -> {
        val active = isFacebookReelsActive(rootNode, packageName)
        activeShortVideoPackage = if (active) packageName else null
        active
      }

      else -> {
        activeShortVideoPackage = null
        false
      }
    }
  }

  fun isExplicitSafeSurface(packageName: String, rootNode: AccessibilityNodeInfo?): Boolean {
    if (rootNode == null) return false
    return when {
      packageName.contains("instagram") -> {
        hasAnyDirectViewId(rootNode, packageName, INSTAGRAM_SAFE_INDICATORS)
      }
      packageName.contains("youtube") -> {
        hasAnyDirectViewId(rootNode, packageName, YOUTUBE_SAFE_INDICATORS) &&
          !hasActiveShortsViewport(rootNode, packageName)
      }
      packageName.contains("snapchat") -> {
        hasAnyDirectViewId(rootNode, packageName, SNAPCHAT_SAFE_INDICATORS) ||
          !isSnapchatSpotlightActive(rootNode, packageName)
      }
      packageName.contains("whatsapp") || packageName.contains("facebook.orca") -> true
      else -> false
    }
  }

  fun hasActiveShortsViewport(rootNode: AccessibilityNodeInfo?, packageName: String): Boolean {
    if (rootNode == null) return false
    val tempRect = Rect()
    for (id in YOUTUBE_SHORTS_DIRECT_IDS.take(4)) {
      val nodes = rootNode.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
      if (!nodes.isNullOrEmpty()) {
        for (node in nodes) {
          if (node.isVisibleToUser) {
            node.getBoundsInScreen(tempRect)
            if (tempRect.height() >= screenHeight * 0.70 && tempRect.bottom > screenHeight / 2) {
              recycleNodes(nodes)
              return true
            }
          }
        }
        recycleNodes(nodes)
      }
    }
    return false
  }

  private fun isChromeStopword(value: String): Boolean {
    val norm = value.lowercase().trim()
    if (norm in CHROME_STOPWORDS || norm.length <= 1) return true
    // Ignore pure counters like "1.2K", "42", "99+"
    if (norm.matches(Regex("^[0-9.,]+[kmbt+]?$"))) return true
    return false
  }

  fun extractReelSignature(packageName: String, rootNode: AccessibilityNodeInfo?): ReelSignature {
    if (rootNode == null) return ReelSignature()

    var author = ""
    var caption = ""
    var audioOrDesc = ""
    var containerKey = ""

    when {
      packageName.contains("instagram") -> {
        for (id in INSTAGRAM_REELS_AUTHOR_IDS) {
          val nodes = rootNode.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
          if (!nodes.isNullOrEmpty()) {
            val (centerNode, _) = selectCenterViewportNode(nodes)
            val text = centerNode?.text?.toString()?.trim() ?: ""
            val desc = centerNode?.contentDescription?.toString()?.trim() ?: ""
            recycleNodes(nodes)
            if (text.isNotBlank() && text.length in 2..40 && !isChromeStopword(text)) {
              author = text
              break
            } else if (desc.startsWith("Profile picture of ", ignoreCase = true)) {
              author = desc.substringAfter("Profile picture of ").trim()
              break
            } else if (desc.endsWith("'s profile picture", ignoreCase = true)) {
              author = desc.substringBefore("'s profile picture").trim()
              break
            }
          }
        }

        for (id in INSTAGRAM_REELS_CAPTION_IDS) {
          val nodes = rootNode.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
          if (!nodes.isNullOrEmpty()) {
            val (centerNode, _) = selectCenterViewportNode(nodes)
            val text = centerNode?.text?.toString()?.trim() ?: ""
            recycleNodes(nodes)
            if (text.isNotBlank() && !isChromeStopword(text)) {
              caption = text
              break
            }
          }
        }

        for (id in INSTAGRAM_AUDIO_IDS) {
          val nodes = rootNode.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
          if (!nodes.isNullOrEmpty()) {
            val (centerNode, _) = selectCenterViewportNode(nodes)
            val text = centerNode?.text?.toString()?.trim() ?: ""
            recycleNodes(nodes)
            if (text.isNotBlank() && !isChromeStopword(text)) {
              audioOrDesc = text
              break
            }
          }
        }

        for (id in INSTAGRAM_DIRECT_CONTAINER_IDS) {
          val nodes = rootNode.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
          if (!nodes.isNullOrEmpty()) {
            val (_, rect) = selectCenterViewportNode(nodes)
            recycleNodes(nodes)
            if (rect != null) {
              containerKey = "${id}_Y${rect.centerY()}_H${rect.height()}"
              break
            }
          }
        }
      }

      packageName.contains("youtube") -> {
        for (id in YOUTUBE_AUTHOR_IDS) {
          val nodes = rootNode.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
          if (!nodes.isNullOrEmpty()) {
            val (centerNode, _) = selectCenterViewportNode(nodes)
            val text = centerNode?.text?.toString()?.trim() ?: ""
            recycleNodes(nodes)
            if (text.isNotBlank() && !isChromeStopword(text)) {
              author = text
              break
            }
          }
        }

        for (id in YOUTUBE_CAPTION_IDS) {
          val nodes = rootNode.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
          if (!nodes.isNullOrEmpty()) {
            val (centerNode, _) = selectCenterViewportNode(nodes)
            val text = centerNode?.text?.toString()?.trim() ?: ""
            recycleNodes(nodes)
            if (text.isNotBlank() && !isChromeStopword(text)) {
              caption = text
              break
            }
          }
        }

        for (id in listOf("reel_watch_fragment_root", "reel_recycler", "reel_player_page_container")) {
          val nodes = rootNode.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
          if (!nodes.isNullOrEmpty()) {
            val (_, rect) = selectCenterViewportNode(nodes)
            recycleNodes(nodes)
            if (rect != null) {
              containerKey = "${id}_Y${rect.centerY()}_H${rect.height()}"
              break
            }
          }
        }
      }
    }

    val tempRect = Rect()
    val foundTextList = mutableListOf<String>()
    var followFound = false

    // For YouTube Shorts, start deepScan inside reel_watch_fragment_root so parent browse_fragment_* doesn't abort it
    var scanRoot: AccessibilityNodeInfo = rootNode
    var shouldRecycleScanRoot = false
    if (packageName.contains("youtube")) {
      val shortsRoots = rootNode.findAccessibilityNodeInfosByViewId("$packageName:id/reel_watch_fragment_root")
      if (!shortsRoots.isNullOrEmpty()) {
        val (centerShorts, _) = selectCenterViewportNode(shortsRoots)
        if (centerShorts != null) {
          scanRoot = centerShorts
        }
        // Recycle only the unused ones if we picked centerShorts; recycle all at the end
        for (n in shortsRoots) {
          if (n != scanRoot) recycleNode(n) else shouldRecycleScanRoot = true
        }
      }
    }

    fun deepScan(node: AccessibilityNodeInfo?, depth: Int) {
      if (node == null || depth > MAX_DEEP_DEPTH) return

      val resId = node.viewIdResourceName ?: ""
      if (resId.contains("row_feed") || resId.contains("feed_tab") || resId.contains("reels_tray") ||
        resId.contains("results_recycler") ||
        resId.contains("comment") || resId.contains("share")
      ) {
        return
      }

      node.getBoundsInScreen(tempRect)
      if (tempRect.bottom <= 60 || tempRect.top >= screenHeight - 60) {
        return
      }

      val text = node.text?.toString()?.trim() ?: ""
      val desc = node.contentDescription?.toString()?.trim() ?: ""

      if (author.isBlank() && desc.isNotBlank()) {
        if (desc.startsWith("Profile picture of ", ignoreCase = true)) {
          author = desc.substringAfter("Profile picture of ").trim()
        } else if (desc.endsWith("'s profile picture", ignoreCase = true)) {
          author = desc.substringBefore("'s profile picture").trim()
        } else if (desc.startsWith("Go to channel ", ignoreCase = true)) {
          author = desc.substringAfter("Go to channel ").trim().trimEnd('.')
        } else if (desc.startsWith("Subscribe to ", ignoreCase = true)) {
          author = desc.substringAfter("Subscribe to ").trim().trimEnd('.')
        }
      }

      if (caption.isBlank() && text.isBlank() && desc.length > 6 && !isChromeStopword(desc)) {
        val dl = desc.lowercase()
        val isActionDesc = dl.startsWith("like this video") ||
          dl.startsWith("dislike this video") ||
          dl.startsWith("view ") ||
          dl.startsWith("share ") ||
          dl.startsWith("see more videos") ||
          dl.startsWith("go to channel") ||
          dl.startsWith("subscribe to") ||
          dl.contains(" minutes ") ||
          dl.contains(" seconds ")
        if (!isActionDesc) {
          caption = desc
        }
      }

      if (text.isNotBlank() && !isChromeStopword(text)) {
        foundTextList.add(text)
        if (text.equals("Follow", ignoreCase = true) || text.equals("Following", ignoreCase = true) ||
          text.equals("Subscribe", ignoreCase = true) || text.equals("Subscribed", ignoreCase = true)
        ) {
          followFound = true
        } else if (author.isBlank() && (text.startsWith("@") || ((followFound || text.contains(".")) && text.length in 3..30 && !text.contains(" ") && !text.contains(":") && !text.contains("•")))) {
          author = text
        } else if (caption.isBlank() && text.length > 8) {
          caption = text
        }
      }

      for (i in 0 until node.childCount) {
        val child = node.getChild(i) ?: continue
        deepScan(child, depth + 1)
        recycleNode(child)
      }
    }

    deepScan(scanRoot, 0)
    if (shouldRecycleScanRoot) {
      recycleNode(scanRoot)
    }

    if (author.isBlank() && foundTextList.isNotEmpty()) {
      for (t in foundTextList) {
        if (t.length in 3..25 && !t.contains(" ") && !isChromeStopword(t)) {
          author = t
          break
        }
      }
    }

    if (caption.isBlank() && foundTextList.size > 1) {
      for (t in foundTextList) {
        if (t != author && t.length > 8 && !isChromeStopword(t) && !t.contains("Translate")) {
          caption = t
          break
        }
      }
    }

    val compositeKey = when {
      author.isNotBlank() || caption.isNotBlank() -> "Hash_${(author + "|" + caption.take(24)).hashCode()}"
      containerKey.isNotBlank() -> containerKey
      foundTextList.isNotEmpty() -> "TextHash_${foundTextList.take(5).joinToString().hashCode()}"
      else -> "Reel_${SystemClock.elapsedRealtime()}"
    }

    return ReelSignature(
      author = author,
      captionPrefix = if (caption.length > 40) caption.take(40) else caption,
      audioOrDesc = audioOrDesc,
      containerKey = compositeKey,
      timestampMs = SystemClock.elapsedRealtime()
    )
  }

  private fun hasAnyDirectViewId(
    root: AccessibilityNodeInfo?,
    packageName: String,
    viewIds: List<String>
  ): Boolean {
    if (root == null) return false
    for (id in viewIds) {
      val found = root.findAccessibilityNodeInfosByViewId("$packageName:id/$id")
      if (!found.isNullOrEmpty()) {
        recycleNodes(found)
        return true
      }
    }
    return false
  }
}
