package com.uberfilter.accessibility

import android.accessibilityservice.AccessibilityService
import android.graphics.Rect
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class UberAccessibilityService : AccessibilityService() {

  companion object {
    private const val TAG = "UberAccessibility"
    private const val MIN_EXTRACT_INTERVAL_MS = 250L
    private const val MAX_TREE_DEPTH = 25
    private const val MAX_TEXT_NODES = 80

    // Lista blanca: Uber Driver + apps de Notas para pruebas locales seguras en casa
    private val ALLOWED_PACKAGES = setOf(
      "com.ubercab.driver",
      "com.miui.notes",
      "com.google.android.keep",
    )

    private val REJECT_KEYWORDS = setOf(
      "x",
      "rechazar",
      "ignorar",
      "cerrar",
      "descartar",
      "dismiss",
      "decline",
      "close",
    )
  }

  private var lastExtractElapsedMs: Long = 0L
  private var lastSignature: String = ""

  override fun onServiceConnected() {
    super.onServiceConnected()
    AccessibilityEventBus.isServiceConnected = true
    Log.i(TAG, "Servicio conectado y escuchando paquetes: $ALLOWED_PACKAGES")
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return

    val pkg = event.packageName?.toString() ?: return
    if (pkg !in ALLOWED_PACKAGES) return

    val nowElapsed = SystemClock.elapsedRealtime()
    if (nowElapsed - lastExtractElapsedMs < MIN_EXTRACT_INTERVAL_MS) {
      return
    }

    val root = rootInActiveWindow ?: return
    lastExtractElapsedMs = nowElapsed

    val textNodes = ArrayList<String>(32)
    var rejectBounds: CapturedBounds? = null

    traverseTree(root, depth = 0, outTexts = textNodes) { candidateBounds ->
      if (rejectBounds == null) {
        rejectBounds = candidateBounds
      }
    }

    if (textNodes.isEmpty()) return

    val signature = "$pkg|${textNodes.joinToString("|")}"
    if (signature == lastSignature) return
    lastSignature = signature

    val snapshot = ScreenSnapshot(
      packageName = pkg,
      timestampMs = System.currentTimeMillis(),
      textNodes = textNodes,
      rejectButtonBounds = rejectBounds,
    )

    AccessibilityEventBus.publish(snapshot)

    Log.d(
      TAG,
      "Captura [$pkg] (${textNodes.size} nodos) rejectBounds=$rejectBounds -> $textNodes",
    )
  }

  private fun traverseTree(
    node: AccessibilityNodeInfo?,
    depth: Int,
    outTexts: MutableList<String>,
    onRejectCandidate: (CapturedBounds) -> Unit,
  ) {
    if (node == null || depth > MAX_TREE_DEPTH || outTexts.size >= MAX_TEXT_NODES) {
      return
    }

    val text = node.text?.toString()?.trim()
    val contentDesc = node.contentDescription?.toString()?.trim()

    if (!text.isNullOrEmpty()) {
      // Si un EditText/Nota tiene varias líneas, las separamos como nodos individuales
      text.lineSequence()
        .map { it.trim() }
        .filter { it.isNotEmpty() }
        .forEach { line ->
          if (outTexts.size < MAX_TEXT_NODES) {
            outTexts.add(line)
          }
        }
    }

    val lowerText = text?.lowercase()
    val lowerDesc = contentDesc?.lowercase()
    val isRejectControl =
      node.isClickable &&
        (
          (lowerText != null && lowerText in REJECT_KEYWORDS) ||
            (lowerDesc != null && REJECT_KEYWORDS.any { kw -> lowerDesc.contains(kw) })
        )

    if (isRejectControl) {
      val rect = Rect()
      node.getBoundsInScreen(rect)
      if (!rect.isEmpty) {
        onRejectCandidate(CapturedBounds(rect.left, rect.top, rect.right, rect.bottom))
      }
    }

    val childCount = node.childCount
    for (i in 0 until childCount) {
      val child = node.getChild(i) ?: continue
      traverseTree(child, depth + 1, outTexts, onRejectCandidate)
    }
  }

  override fun onInterrupt() {
    Log.w(TAG, "Servicio interrumpido por el sistema")
  }

  override fun onDestroy() {
    AccessibilityEventBus.isServiceConnected = false
    Log.i(TAG, "Servicio destruido")
    super.onDestroy()
  }
}
