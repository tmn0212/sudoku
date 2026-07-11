/**
 * Minimal in-app screen router (no react-router dependency). Holds the active
 * screen, its params, and a back stack. iOS standalone PWAs have no browser
 * chrome, so navigation is driven by in-app controls and `back()`.
 */

import { create } from 'zustand';

export type Screen =
  | 'home'
  | 'game'
  | 'learn'
  | 'lesson'
  | 'stats'
  | 'settings'
  | 'difficulties'
  | 'challenges';

export type ScreenParams = Record<string, string | number>;

interface Route {
  screen: Screen;
  params: ScreenParams;
}

interface UiState extends Route {
  stack: Route[];
  navigate: (screen: Screen, params?: ScreenParams) => void;
  back: () => void;
  /** Jump to a screen and clear the back stack (e.g. Home). */
  reset: (screen: Screen, params?: ScreenParams) => void;
  canGoBack: () => boolean;
}

export const useUi = create<UiState>()((set, get) => ({
  screen: 'home',
  params: {},
  stack: [],

  navigate: (screen, params = {}) =>
    set((s) => ({
      screen,
      params,
      stack: [...s.stack, { screen: s.screen, params: s.params }],
    })),

  back: () =>
    set((s) => {
      if (s.stack.length === 0) return { screen: 'home', params: {} };
      const stack = s.stack.slice(0, -1);
      const prev = s.stack[s.stack.length - 1];
      return { screen: prev.screen, params: prev.params, stack };
    }),

  reset: (screen, params = {}) => set({ screen, params, stack: [] }),

  canGoBack: () => get().stack.length > 0,
}));
