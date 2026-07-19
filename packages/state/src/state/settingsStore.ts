/**
 * Global user preferences: color theme + display/assist toggles. Persisted to
 * localStorage (small, sync). Game-scoped state lives in the game store.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  isThemeId,
  isFontId,
  isAnimStyleId,
  type ThemeId,
  type FontId,
  type AnimStyleId,
  type SfxStyleId,
  type MusicTrackId,
} from '@sudoku/ui-tokens';
import type {
  KeyValueStore,
  ThemeApplier,
  FontApplier,
  AnimApplier,
} from '../ports';

/** Platform dependencies injected when the app instantiates the settings store. */
export interface SettingsStoreDeps {
  storage: KeyValueStore;
  themeApplier: ThemeApplier;
  fontApplier: FontApplier;
  animApplier: AnimApplier;
}

export interface SettingsState {
  theme: ThemeId;
  /** Typeface applied across the app (board digits + UI chrome). */
  font: FontId;
  /** Board animation style (placement + completion effects). */
  animStyle: AnimStyleId;
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
  /** Play sound effects (placement, completion, win/lose, …). */
  sound: boolean;
  /** Which sound-effect pack (timbre) to play. */
  soundStyle: SfxStyleId;
  /** Sound-effect volume, 0–1. */
  soundVolume: number;
  /** Play the looping background music. */
  music: boolean;
  /** Which background-music track/style to loop. */
  musicTrack: MusicTrackId;
  /** Background-music volume, 0–1. */
  musicVolume: number;
  /** A tool picked by a gesture (drag, double-tap, hold) lasts only for the next
   *  entry, then snaps back to the committed mode-bar tool. */
  autoRevertMode: boolean;

  setTheme: (theme: ThemeId) => void;
  setFont: (font: FontId) => void;
  setAnimStyle: (animStyle: AnimStyleId) => void;
  setSoundStyle: (soundStyle: SfxStyleId) => void;
  setMusicTrack: (musicTrack: MusicTrackId) => void;
  setSoundVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
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
  | 'sound'
  | 'music'
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
        font: 'system',
        animStyle: 'classic',
        highlightPeers: true,
        highlightSame: true,
        highlightNotes: true,
        highlightCrosshatch: true,
        autoCleanupNotes: true,
        warnOnBanned: true,
        showRemaining: true,
        celebrateCompletions: true,
        sound: true,
        soundStyle: 'chime',
        soundVolume: 0.7,
        music: false,
        musicTrack: 'lofi',
        musicVolume: 0.5,
        autoRevertMode: true,

        setTheme: (theme) => {
          deps.themeApplier.apply(theme);
          set({ theme });
        },
        setFont: (font) => {
          deps.fontApplier.apply(font);
          set({ font });
        },
        setAnimStyle: (animStyle) => {
          deps.animApplier.apply(animStyle);
          set({ animStyle });
        },
        setSoundStyle: (soundStyle) => set({ soundStyle }),
        setMusicTrack: (musicTrack) => set({ musicTrack }),
        setSoundVolume: (v) => set({ soundVolume: Math.max(0, Math.min(1, v)) }),
        setMusicVolume: (v) => set({ musicVolume: Math.max(0, Math.min(1, v)) }),
        toggle: (key) => set({ [key]: !get()[key] } as Partial<SettingsState>),
      }),
      {
        name: 'sudoku-settings',
        version: 1,
        storage: createJSONStorage(() => deps.storage),
      },
    ),
  );

  /** Apply the persisted theme + font once at startup (called from main.tsx),
   *  before first paint, to avoid a flash of the defaults. */
  const initSettings = (): void => {
    const raw = deps.storage.getItem('sudoku-settings');
    let theme: ThemeId = 'system';
    let font: FontId = 'system';
    let animStyle: AnimStyleId = 'classic';
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const storedTheme = parsed?.state?.theme;
        const storedFont = parsed?.state?.font;
        const storedAnim = parsed?.state?.animStyle;
        if (typeof storedTheme === 'string' && isThemeId(storedTheme)) theme = storedTheme;
        if (typeof storedFont === 'string' && isFontId(storedFont)) font = storedFont;
        if (typeof storedAnim === 'string' && isAnimStyleId(storedAnim)) animStyle = storedAnim;
      } catch {
        /* ignore malformed storage */
      }
    }
    deps.themeApplier.apply(theme);
    deps.fontApplier.apply(font);
    deps.animApplier.apply(animStyle);
  };

  return { useSettings, initSettings };
};
