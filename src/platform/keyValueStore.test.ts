// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { webKeyValueStore } from './keyValueStore';

describe('webKeyValueStore', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips values through localStorage', () => {
    webKeyValueStore.setItem('k', 'v');
    expect(webKeyValueStore.getItem('k')).toBe('v');
    expect(localStorage.getItem('k')).toBe('v');
  });

  it('returns null for a missing key', () => {
    expect(webKeyValueStore.getItem('missing')).toBeNull();
  });

  it('removes a value', () => {
    webKeyValueStore.setItem('k', 'v');
    webKeyValueStore.removeItem('k');
    expect(webKeyValueStore.getItem('k')).toBeNull();
  });
});
