// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useSettings } from './settingsStore';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  useSettings.setState({
    theme: 'system',
    highlightPeers: true,
    highlightSame: true,
    autoCleanupNotes: true,
    showRemaining: true,
  });
});

describe('settingsStore', () => {
  it('applies an explicit theme to the document root', () => {
    useSettings.getState().setTheme('dark');
    expect(useSettings.getState().theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('clears the attribute for the system theme', () => {
    useSettings.getState().setTheme('ocean');
    expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
    useSettings.getState().setTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('toggles boolean preferences', () => {
    expect(useSettings.getState().highlightPeers).toBe(true);
    useSettings.getState().toggle('highlightPeers');
    expect(useSettings.getState().highlightPeers).toBe(false);
    useSettings.getState().toggle('showRemaining');
    expect(useSettings.getState().showRemaining).toBe(false);
  });

  it('persists the chosen theme to localStorage', () => {
    useSettings.getState().setTheme('forest');
    const raw = localStorage.getItem('sudoku-settings');
    expect(raw).toContain('forest');
  });
});
