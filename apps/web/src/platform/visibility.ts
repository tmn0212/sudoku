/**
 * App-visibility port.
 *
 * The timer (pause while backgrounded) and the save-roster (flush on hide) both
 * need to know when the app goes to the background. On web that's the Page
 * Visibility API + `pagehide`; on native it's RN's `AppState`. Consumers depend
 * on this interface so the native version swaps the event source without touching
 * the timer/save logic.
 */

export interface AppVisibility {
  /** True when the app is currently backgrounded/hidden. */
  isHidden(): boolean;
  /**
   * Subscribe to "the app is being hidden/backgrounded" (tab hidden or page
   * unloading). Returns an unsubscribe function.
   */
  onHide(cb: () => void): () => void;
  /**
   * Subscribe to "the app returned to the foreground" (tab visible again or
   * restored from bfcache). Returns an unsubscribe function. Used to resume
   * background music that was paused on hide.
   */
  onShow(cb: () => void): () => void;
}

/** Web adapter over the Page Visibility API + `pagehide`. */
export const webAppVisibility: AppVisibility = {
  isHidden: () => typeof document !== 'undefined' && document.hidden,
  onHide: (cb) => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') cb();
    };
    document.addEventListener('visibilitychange', onVisibility);
    // `pagehide` covers the terminal case the visibility event can miss (bfcache
    // eviction / real unload), where we must flush unconditionally.
    window.addEventListener('pagehide', cb);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', cb);
    };
  },
  onShow: (cb) => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') cb();
    };
    document.addEventListener('visibilitychange', onVisibility);
    // `pageshow` fires on bfcache restore, which visibilitychange can miss.
    window.addEventListener('pageshow', cb);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', cb);
    };
  },
};

/** The active visibility source (web today; a native port swaps this binding). */
export const appVisibility: AppVisibility = webAppVisibility;
