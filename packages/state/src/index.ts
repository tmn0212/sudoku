/**
 * `@sudoku/state` — the shared Zustand stores + the platform ports they depend on.
 *
 * Stores that need platform adapters (game persistence, settings theme applier,
 * ban-confirm → game) are exported as **factories** (`createXStore(deps)`); the web
 * app instantiates them with its adapters (see apps/web/src/game|state/*). The
 * dependency-free stores (router, fx) are exported as ready singletons.
 */

export * from './ports';
export * from './game/store';
export * from './state/settingsStore';
export * from './state/uiStore';
export * from './state/fxStore';
export * from './state/banPromptStore';
