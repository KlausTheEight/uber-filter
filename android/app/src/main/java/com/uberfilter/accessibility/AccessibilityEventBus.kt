package com.uberfilter.accessibility

data class CapturedBounds(
  val left: Int,
  val top: Int,
  val right: Int,
  val bottom: Int,
)

data class ScreenSnapshot(
  val packageName: String,
  val timestampMs: Long,
  val textNodes: List<String>,
  val rejectButtonBounds: CapturedBounds?,
)

object AccessibilityEventBus {
  @Volatile
  var isServiceConnected: Boolean = false

  @Volatile
  var lastSnapshot: ScreenSnapshot? = null

  @Volatile
  private var listener: ((ScreenSnapshot) -> Unit)? = null

  fun setListener(newListener: ((ScreenSnapshot) -> Unit)?) {
    listener = newListener
  }

  fun publish(snapshot: ScreenSnapshot) {
    lastSnapshot = snapshot
    listener?.invoke(snapshot)
  }
}
