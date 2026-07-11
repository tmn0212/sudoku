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
