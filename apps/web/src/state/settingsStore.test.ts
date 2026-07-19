// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useSettings } from './settingsStore';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-anim');
  document.documentElement.style.removeProperty('--app-font');
  useSettings.setState({
    theme: 'system',
    font: 'system',
    animStyle: 'classic',
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

  it('applies an explicit font as the --app-font var', () => {
    useSettings.getState().setFont('mono');
    expect(useSettings.getState().font).toBe('mono');
    expect(document.documentElement.style.getPropertyValue('--app-font')).toContain(
      'monospace',
    );
  });

  it('clears the --app-font var for the system font', () => {
    useSettings.getState().setFont('arcade');
    expect(document.documentElement.style.getPropertyValue('--app-font')).toContain('VT323');
    useSettings.getState().setFont('system');
    expect(document.documentElement.style.getPropertyValue('--app-font')).toBe('');
  });

  it('persists the chosen font to localStorage', () => {
    useSettings.getState().setFont('rounded');
    const raw = localStorage.getItem('sudoku-settings');
    expect(raw).toContain('rounded');
  });

  it('applies an explicit animation style via data-anim', () => {
    useSettings.getState().setAnimStyle('bouncy');
    expect(useSettings.getState().animStyle).toBe('bouncy');
    expect(document.documentElement.getAttribute('data-anim')).toBe('bouncy');
  });

  it('clears data-anim for the classic (default) style', () => {
    useSettings.getState().setAnimStyle('glow');
    expect(document.documentElement.getAttribute('data-anim')).toBe('glow');
    useSettings.getState().setAnimStyle('classic');
    expect(document.documentElement.hasAttribute('data-anim')).toBe(false);
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
