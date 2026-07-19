// Web wiring: instantiate the shared settings store with the web platform adapters
// (localStorage-backed key/value store + the DOM `data-theme` applier).
import { createSettingsStore } from '@sudoku/state';
import { webKeyValueStore } from '../platform/keyValueStore';
import { webThemeApplier } from '../platform/theme';
import { webFontApplier } from '../platform/font';

const { useSettings, initSettings } = createSettingsStore({
  storage: webKeyValueStore,
  themeApplier: webThemeApplier,
  fontApplier: webFontApplier,
});

export { useSettings, initSettings };
export type { SettingsState } from '@sudoku/state';
