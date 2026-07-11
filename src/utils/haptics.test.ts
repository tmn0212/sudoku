// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { haptics } from './haptics';

const nav: { vibrate?: (p: number | number[]) => boolean } = navigator;

afterEach(() => {
  nav.vibrate = undefined;
});

describe('haptics', () => {
  it('does nothing (and never throws) when the Vibration API is absent', () => {
    nav.vibrate = undefined;
    expect(() => {
      haptics.tap();
      haptics.error();
      haptics.success();
    }).not.toThrow();
  });

  it('forwards patterns to navigator.vibrate when available', () => {
    const spy = vi.fn();
    nav.vibrate = spy;
    haptics.tap();
    expect(spy).toHaveBeenCalledWith(8);
    haptics.error();
    expect(spy).toHaveBeenCalledWith([0, 40, 30, 40]);
  });

  it('swallows errors thrown by vibrate', () => {
    nav.vibrate = () => {
      throw new Error('unsupported');
    };
    expect(() => haptics.success()).not.toThrow();
  });
});
