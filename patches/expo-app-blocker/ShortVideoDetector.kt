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

    // Check 1: Author delta (highest confidence signal)
    if (author.isNotBlank() && other.author.isNotBlank() &&
      !author.equals(other.author, ignoreCase = true)
    ) {
      return true
    }

    // Check 2: Caption delta (detects consecutive reels from same creator)
    if (captionPrefix.isNotBlank() && other.captionPrefix.isNotBlank() &&
      !captionPrefix.equals(other.captionPrefix, ignoreCase = true)
    ) {
      return true
    }

    // Check 3: Audio or attribution tag delta
    if (audioOrDesc.isNotBlank() && other.audioOrDesc.isNotBlank() &&
      !audioOrDesc.equals(other.audioOrDesc, ignoreCase = true)
    ) {
      return true
    }

    // Check 4: Container / Viewport Key delta (only when both lack author & caption)
    if (author.isBlank() && other.author.isBlank() &&
      captionPrefix.isBlank() && other.captionPrefix.isBlank() &&
      containerKey.isNotBlank() && other.containerKey.isNotBlank() &&
      containerKey != other.containerKey
    ) {
      return true
    }

    // Check 5: Transition between text-bearing and non-text reels
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

  val INSTAGRAM_MODAL_INDICATORS = listOf(
    "comments_recycler_view",
    "layout_comment_thread",
    "comment_composer",
    "comment_composer_view",
    "comment_composer_edit_text",
    "comment_sheet",
    "comment_rows",
    "action_bar_title_comment",
    "row_comment",
    "comments_list",
    "comment_input_row",
    "bottom_sheet_container",
    "igds_bottom_sheet_layout",
    "igds_bottom_sheet",
    "modal_sheet",
    "direct_share_sheet",
    "sharesheet_recycler_view",
    "share_sheet_container",
    "likes_list_recycler_view"
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

  private val YOUTUBE_MODAL_INDICATORS = listOf(
    "engagement_panel_wrapper",
    "engagement_panel",
    "modern_bottom_sheet_container",
    "bottom_sheet_container",
    "comment_composer",
    "comments_entry_point_teaser_container",
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

  private val MODAL_SEMANTIC_KEYWORDS = listOf(
    "add a comment",
    "add comment",
    "write a comment",
    "no comments yet",
    "view replies",
    "send to",
    "add to story",
    "copy link",
    "send in messenger",
    "top comments",
    "newest first",
    "share to"
  )

  fun isInstagramCommentSheetActive(rootNode: AccessibilityNodeInfo?): Boolean =
    isModalOrDrawerOpen("com.instagram.android", rootNode)

  /**
   * Unified Modal / Bottom-Sheet / Comments / Share-Sheet Suppression (Mindful & NoScroll parity).
   * When true, all scroll events are ignored and the tracker enters PAUSED_MODAL state.
   */
  fun isModalOrDrawerOpen(packageName: String, rootNode: AccessibilityNodeInfo?): Boolean {
    if (rootNode == null) return false

    when {
      packageName.contains("instagram") -> {
        if (hasAnyDirectViewId(rootNode, packageName, INSTAGRAM_MODAL_INDICATORS)) return true
      }
      packageName.contains("youtube") -> {
        if (hasAnyDirectViewId(rootNode, packageName, YOUTUBE_MODAL_INDICATORS)) return true
      }
    }

    // Bounded semantic scan (depth <= 14) catches Jetpack Compose / Meta Bloks bottom sheets
    var foundModalText = false
    fun scanModalMarkers(node: AccessibilityNodeInfo?, depth: Int) {
      if (node == null || depth > MODAL_SCAN_DEPTH || foundModalText) return
      val resId = node.viewIdResourceName?.lowercase() ?: ""
      if (resId.contains("bottom_sheet") ||
        resId.contains("engagement_panel") ||
        resId.contains("comment_composer") ||
        resId.contains("comments_recycler") ||
        resId.contains("sharesheet") ||
        resId.contains("direct_share_sheet")
      ) {
        if (node.isVisibleToUser) {
          foundModalText = true
          return
        }
      }

      val text = node.text?.toString()?.lowercase()?.trim() ?: ""
      val desc = node.contentDescription?.toString()?.lowercase()?.trim() ?: ""
      if (text.isNotEmpty() && MODAL_SEMANTIC_KEYWORDS.any { text.contains(it) }) {
        foundModalText = true
        return
      }
      if (desc.isNotEmpty() && MODAL_SEMANTIC_KEYWORDS.any { desc.contains(it) }) {
        foundModalText = true
        return
      }

      for (i in 0 until node.childCount) {
        val child = node.getChild(i) ?: continue
        scanModalMarkers(child, depth + 1)
        recycleNode(child)
        if (foundModalText) return
      }
    }

    scanModalMarkers(rootNode, 0)
    return foundModalText
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

  /**
   * Strict Snapchat Spotlight check: rejects Chat, Inbox, Stories, Camera, Map, and Discover.
   */
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

  /**
   * Strict Facebook Reels check: rejects News Feed, Messenger, Marketplace, Groups, and Comments.
   */
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
   * Validates whether a physical scroll event originated from an actual full-screen short-video pager
   * (never from comments, share sheets, DMs, or chat lists).
   */
  fun isValidShortVideoScroll(
    packageName: String,
    sourceNode: AccessibilityNodeInfo?,
    rootNode: AccessibilityNodeInfo?
  ): Boolean {
    if (isModalOrDrawerOpen(packageName, rootNode) || isExplicitSafeSurface(packageName, rootNode)) {
      return false
    }

    val sourceId = sourceNode?.viewIdResourceName?.lowercase() ?: ""
    val sourceClass = sourceNode?.className?.toString()?.lowercase() ?: ""

    if (sourceNode != null) {
      val rect = Rect()
      sourceNode.getBoundsInScreen(rect)
      // Bottom sheets, comment lists, and story trays are smaller than the full-screen video pager
      if (rect.height() in 1 until (screenHeight * 0.55f).toInt()) {
        return false
      }
    }

    return when {
      packageName.contains("youtube") -> {
        (sourceId.contains("reel_recycler") || sourceId.contains("shorts_recycler") ||
          (sourceId.contains("reel") && !sourceId.contains("time_bar"))) &&
          hasActiveShortsViewport(rootNode, packageName)
      }
      packageName.contains("instagram") -> {
        if (sourceId.contains("direct") || sourceId.contains("thread") ||
          sourceId.contains("message") || sourceId.contains("inbox") ||
          sourceId.contains("row_feed") || sourceId.contains("composer") ||
          sourceId.contains("comment") || sourceId.contains("share")
        ) {
          false
        } else {
          hasInstagramReelIndicators(rootNode, packageName) &&
            (sourceId.contains("clips") || sourceId.contains("reel") ||
              sourceClass.contains("viewpager") || sourceClass.contains("recyclerview"))
        }
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
    for (id in listOf("reel_recycler", "reel_watch_fragment_root", "reel_player_page_container", "shorts_container")) {
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
            if (text.isNotBlank() && text.length in 2..40) {
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
            if (text.isNotBlank()) {
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
            if (text.isNotBlank()) {
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

    fun deepScan(node: AccessibilityNodeInfo?, depth: Int) {
      if (node == null || depth > MAX_DEEP_DEPTH) return

      val resId = node.viewIdResourceName ?: ""
      if (resId.contains("row_feed") || resId.contains("feed_tab") || resId.contains("reels_tray") ||
        resId.contains("browse_fragment") || resId.contains("results_recycler") ||
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
        } else if (desc.startsWith("Subscribe to ", ignoreCase = true)) {
          author = desc.substringAfter("Subscribe to ").trim()
        }
      }

      if (text.isNotBlank()) {
        foundTextList.add(text)
        if (text.equals("Follow", ignoreCase = true) || text.equals("Following", ignoreCase = true) ||
          text.equals("Subscribe", ignoreCase = true) || text.equals("Subscribed", ignoreCase = true)
        ) {
          followFound = true
        } else if (author.isBlank() && (text.startsWith("@") || ((followFound || text.contains(".")) && text.length in 3..30 && !text.contains(" ") && !text.contains(":") && !text.contains("•")))) {
          author = text
        } else if (caption.isBlank() && text.length > 8 && !text.equals("Interested", ignoreCase = true) && !text.equals("Not interested", ignoreCase = true)) {
          caption = text
        }
      }

      for (i in 0 until node.childCount) {
        val child = node.getChild(i) ?: continue
        deepScan(child, depth + 1)
        recycleNode(child)
      }
    }

    deepScan(rootNode, 0)

    if (author.isBlank() && foundTextList.isNotEmpty()) {
      for (t in foundTextList) {
        if (t.length in 3..25 && !t.contains(" ") && !t.contains("Like") && !t.contains("Comment")) {
          author = t
          break
        }
      }
    }

    if (caption.isBlank() && foundTextList.size > 1) {
      for (t in foundTextList) {
        if (t != author && t.length > 8 && !t.contains("Follow") && !t.contains("Translate")) {
          caption = t
          break
        }
      }
    }

    // Build stable composite key WITHOUT volatile like/comment counters
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
