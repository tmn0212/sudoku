/**
 * Best-effort haptic feedback via the Vibration API. Supported on Android
 * Chrome; a no-op on iOS Safari and anywhere the API is missing, so callers can
 * fire it unconditionally without feature-checking.
 */

type Pattern = number | number[];

const vibrate = (pattern: Pattern): void => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported — ignore */
  }
};

export const haptics = {
  /** A light tap for a successful placement. */
  tap: () => vibrate(8),
  /** A sharper buzz for a mistake. */
  error: () => vibrate([0, 40, 30, 40]),
  /** A celebratory pattern for a win. */
  success: () => vibrate([0, 30, 40, 30, 40, 60]),
};
