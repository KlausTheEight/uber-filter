import {NativeEventEmitter, NativeModules} from 'react-native';
import {ScreenBounds} from '../domain/types';

export interface NativeScreenSnapshot {
  packageName: string;
  timestampMs: number;
  textNodes: string[];
  rejectButtonBounds?: ScreenBounds | null;
}

interface UberAccessibilityNativeModule {
  isServiceEnabled(): Promise<boolean>;
  getLastSnapshot(): Promise<NativeScreenSnapshot | null>;
  openAccessibilitySettings(): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const nativeModule = NativeModules.UberAccessibilityModule as
  | UberAccessibilityNativeModule
  | undefined;

const EVENT_SCREEN_SNAPSHOT = 'onScreenSnapshot';

export function isNativeBridgeAvailable(): boolean {
  return nativeModule != null;
}

export async function isAccessibilityServiceEnabled(): Promise<boolean> {
  if (!nativeModule) {
    return false;
  }
  return nativeModule.isServiceEnabled();
}

export async function getLastScreenSnapshot(): Promise<NativeScreenSnapshot | null> {
  if (!nativeModule) {
    return null;
  }
  return nativeModule.getLastSnapshot();
}

export function openAccessibilitySettings(): void {
  nativeModule?.openAccessibilitySettings();
}

export function subscribeToScreenSnapshots(
  callback: (snapshot: NativeScreenSnapshot) => void,
): () => void {
  if (!nativeModule) {
    return () => {};
  }

  const emitter = new NativeEventEmitter(nativeModule);
  const subscription = emitter.addListener(
    EVENT_SCREEN_SNAPSHOT,
    (payload: unknown) => {
      callback(payload as NativeScreenSnapshot);
    },
  );
  return () => subscription.remove();
}
