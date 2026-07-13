/**
 * Haptic-feedback port.
 *
 * Consumers depend on the `Haptics` interface, never on `navigator` directly, so
 * a native port swaps the implementation instead of hunting call sites. The web
 * adapter uses the Vibration API (supported on Android Chrome; a silent no-op on
 * iOS Safari and anywhere the API is missing), so callers fire it unconditionally.
 * A future native app provides an `expo-haptics`-backed impl of the same interface.
 */

export interface Haptics {
  /** A light tap for a successful placement. */
  tap(): void;
  /** A sharper buzz for a mistake. */
  error(): void;
  /** A celebratory pattern for a win. */
  success(): void;
}

type Pattern = number | number[];

const vibrate = (pattern: Pattern): void => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported — ignore */
  }
};

/** Web adapter over the Vibration API. */
export const webHaptics: Haptics = {
  tap: () => vibrate(8),
  error: () => vibrate([0, 40, 30, 40]),
  success: () => vibrate([0, 30, 40, 30, 40, 60]),
};

/** The active haptics implementation (web today; a native port swaps this binding). */
export const haptics: Haptics = webHaptics;
