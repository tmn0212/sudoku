import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './theme/themes.css';
import { initSettings } from './state/settingsStore';
import App from './App.tsx';

// Apply the persisted theme before first paint to avoid a flash.
initSettings();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
