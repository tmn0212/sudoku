import { useEffect } from 'react';
import { sound } from '../platform/sound';
import { useSettings } from '../state/settingsStore';

/**
 * Plays a subtle click on every chrome `<button>` press app-wide (menus, nav,
 * settings, home, …) — so the UI feels tactile everywhere, not just in-game.
 *
 * Skips the game input surfaces (`.board`, `.app__pad` = mode bar + number pad +
 * controls), which already emit their own richer game SFX via the store/hooks,
 * and any control marked `data-no-click-sound` (e.g. the audio preview chips,
 * which play their own sample). Gated on the `sound` setting. Mounted once by App.
 *
 * All chrome controls are native `<button>`s, so one delegated document listener
 * covers them; the sound routes through the same Web Audio pipeline as the game
 * SFX (silent until the first gesture unlocks the AudioContext).
 */
export const useUiClickSound = (): void => {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!useSettings.getState().sound) return;
      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.('button');
      if (!btn || btn.disabled) return;
      if (btn.closest('.board, .app__pad, [data-no-click-sound]')) return;
      sound.click();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
};
