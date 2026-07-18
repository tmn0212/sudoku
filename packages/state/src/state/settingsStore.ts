/**
 * Global user preferences: color theme + display/assist toggles. Persisted to
 * localStorage (small, sync). Game-scoped state lives in the game store.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { isThemeId, type ThemeId } from '@sudoku/ui-tokens';
import type { KeyValueStore, ThemeApplier } from '../ports';

/** Platform dependencies injected when the app instantiates the settings store. */
export interface SettingsStoreDeps {
  storage: KeyValueStore;
  themeApplier: ThemeApplier;
}

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
  /** A tool picked by a gesture (drag, double-tap, hold) lasts only for the next
   *  entry, then snaps back to the committed mode-bar tool. */
  autoRevertMode: boolean;

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
  | 'celebrateCompletions'
  | 'autoRevertMode';

/**
 * Instantiate the settings store + its startup initializer, wired to injected
 * platform adapters. Returns both so the app can share one deps set.
 */
export const createSettingsStore = (deps: SettingsStoreDeps) => {
  const useSettings = create<SettingsState>()(
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
        autoRevertMode: true,

        setTheme: (theme) => {
          deps.themeApplier.apply(theme);
          set({ theme });
        },
        toggle: (key) => set({ [key]: !get()[key] } as Partial<SettingsState>),
      }),
      {
        name: 'sudoku-settings',
        version: 1,
        storage: createJSONStorage(() => deps.storage),
      },
    ),
  );

  /** Apply the persisted theme once at startup (called from main.tsx). */
  const initSettings = (): void => {
    const raw = deps.storage.getItem('sudoku-settings');
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
    deps.themeApplier.apply(theme);
  };

  return { useSettings, initSettings };
};
