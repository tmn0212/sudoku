import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './theme/themes.css';
import { initSettings } from './state/settingsStore';
import App from './App.tsx';

// Apply the persisted theme before first paint to avoid a flash.
initSettings();

// Expose stores in dev for quick manual/e2e inspection (stripped from prod).
if (import.meta.env.DEV) {
  void Promise.all([
    import('./game/store'),
    import('./state/uiStore'),
    import('./state/settingsStore'),
  ]).then(([g, u, s]) => {
    (window as unknown as { __stores?: unknown }).__stores = {
      game: g.useGame,
      ui: u.useUi,
      settings: s.useSettings,
    };
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Fade out the branded splash once the app has mounted, keeping it on screen a
// minimum of ~1s so the branding reads even on a warm/instant load.
const dismissSplash = () => {
  const el = document.getElementById('splash');
  if (!el) return;
  const MIN_MS = 1000;
  const shownFor = Date.now() - ((window as { __splashAt?: number }).__splashAt ?? Date.now());
  const wait = Math.max(0, MIN_MS - shownFor);
  window.setTimeout(() => {
    el.classList.add('splash--hide');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
    // Fallback removal in case the transitionend never fires.
    window.setTimeout(() => el.remove(), 600);
  }, wait);
};
requestAnimationFrame(() => requestAnimationFrame(dismissSplash));
