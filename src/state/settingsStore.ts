/**
 * Global user preferences: color theme + display/assist toggles. Persisted to
 * localStorage (small, sync). Game-scoped state lives in the game store.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { applyTheme, isThemeId, type ThemeId } from '../theme/themes';

export interface SettingsState {
  theme: ThemeId;
  /** Highlight the row/column/box of the selected cell. */
  highlightPeers: boolean;
  /** Highlight all cells sharing the selected cell's digit. */
  highlightSame: boolean;
  /** When placing a digit, remove it from peers' pencil marks. */
  autoCleanupNotes: boolean;
  /** Show the remaining-count badge under each number-pad key. */
  showRemaining: boolean;

  setTheme: (theme: ThemeId) => void;
  toggle: (key: BooleanSettingKey) => void;
}

type BooleanSettingKey =
  | 'highlightPeers'
  | 'highlightSame'
  | 'autoCleanupNotes'
  | 'showRemaining';

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      highlightPeers: true,
      highlightSame: true,
      autoCleanupNotes: true,
      showRemaining: true,

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggle: (key) => set({ [key]: !get()[key] } as Partial<SettingsState>),
    }),
    {
      name: 'sudoku-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Apply the persisted theme once at startup (called from main.tsx). */
export const initSettings = (): void => {
  const raw = typeof localStorage !== 'undefined' && localStorage.getItem('sudoku-settings');
  let theme: ThemeId = 'system';
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const stored = parsed?.state?.theme;
      if (typeof stored === 'string' && isThemeId(stored)) theme = stored;
    } catch {
      /* ignore malformed storage */
    }
  }
  applyTheme(theme);
};
