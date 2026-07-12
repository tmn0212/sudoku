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
  /** Highlight the matching pencil mark in cells that note the selected digit. */
  highlightNotes: boolean;
  /** Shade the rows and columns through every cell holding the selected digit
   *  (a "crossroad" that reveals where that digit can still go). */
  highlightCrosshatch: boolean;
  /** When placing a digit, remove it from peers' pencil marks. */
  autoCleanupNotes: boolean;
  /** Ask for confirmation before placing a digit you've banned in that cell. */
  warnOnBanned: boolean;
  /** Show the remaining-count badge under each number-pad key. */
  showRemaining: boolean;
  /** Play the green celebration flash when a row/column/box or digit is finished. */
  celebrateCompletions: boolean;

  setTheme: (theme: ThemeId) => void;
  toggle: (key: BooleanSettingKey) => void;
}

type BooleanSettingKey =
  | 'highlightPeers'
  | 'highlightSame'
  | 'highlightNotes'
  | 'highlightCrosshatch'
  | 'autoCleanupNotes'
  | 'warnOnBanned'
  | 'showRemaining'
  | 'celebrateCompletions';

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      highlightPeers: true,
      highlightSame: true,
      highlightNotes: true,
      highlightCrosshatch: true,
      autoCleanupNotes: true,
      warnOnBanned: true,
      showRemaining: true,
      celebrateCompletions: true,

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
