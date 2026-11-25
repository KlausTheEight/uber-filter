package com.uberfilter.accessibility

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class UberAccessibilityModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val MODULE_NAME = "UberAccessibilityModule"
    const val EVENT_SCREEN_SNAPSHOT = "onScreenSnapshot"
  }

  override fun getName(): String = MODULE_NAME

  override fun initialize() {
    super.initialize()
    AccessibilityEventBus.setListener { snapshot ->
      emitSnapshot(snapshot)
    }
  }

  override fun invalidate() {
    AccessibilityEventBus.setListener(null)
    super.invalidate()
  }

  @ReactMethod
  fun isServiceEnabled(promise: Promise) {
    promise.resolve(AccessibilityEventBus.isServiceConnected)
  }

  @ReactMethod
  fun getLastSnapshot(promise: Promise) {
    val snapshot = AccessibilityEventBus.lastSnapshot
    if (snapshot == null) {
      promise.resolve(null)
      return
    }
    promise.resolve(snapshotToWritableMap(snapshot))
  }

  @ReactMethod
  fun openAccessibilitySettings() {
    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  // Requeridos por NativeEventEmitter en React Native para evitar warnings
  @ReactMethod
  fun addListener(eventName: String) {
    // No-op
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // No-op
  }

  private fun emitSnapshot(snapshot: ScreenSnapshot) {
    if (!reactContext.hasActiveReactInstance()) {
      return
    }
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(EVENT_SCREEN_SNAPSHOT, snapshotToWritableMap(snapshot))
    } catch (_: Exception) {
      // Evita crashes si el motor JS está suspendido mientras la app está en segundo plano
    }
  }

  private fun snapshotToWritableMap(snapshot: ScreenSnapshot): WritableMap {
    val map = Arguments.createMap()
    map.putString("packageName", snapshot.packageName)
    map.putDouble("timestampMs", snapshot.timestampMs.toDouble())

    val nodesArray = Arguments.createArray()
    for (node in snapshot.textNodes) {
      nodesArray.pushString(node)
    }
    map.putArray("textNodes", nodesArray)

    val bounds = snapshot.rejectButtonBounds
    if (bounds != null) {
      val boundsMap = Arguments.createMap()
      boundsMap.putInt("left", bounds.left)
      boundsMap.putInt("top", bounds.top)
      boundsMap.putInt("right", bounds.right)
      boundsMap.putInt("bottom", bounds.bottom)
      map.putMap("rejectButtonBounds", boundsMap)
    } else {
      map.putNull("rejectButtonBounds")
    }

    return map
  }
}
