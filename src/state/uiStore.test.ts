import { describe, it, expect, beforeEach } from 'vitest';
import { useUi } from './uiStore';

const reset = () => useUi.setState({ screen: 'home', params: {}, stack: [] });

describe('uiStore router', () => {
  beforeEach(reset);

  it('navigates and records a back stack', () => {
    useUi.getState().navigate('settings');
    expect(useUi.getState().screen).toBe('settings');
    expect(useUi.getState().canGoBack()).toBe(true);
  });

  it('passes params', () => {
    useUi.getState().navigate('lesson', { id: 'naked-single' });
    expect(useUi.getState().params).toEqual({ id: 'naked-single' });
  });

  it('goes back to the previous screen', () => {
    useUi.getState().navigate('learn');
    useUi.getState().navigate('lesson', { id: 'x' });
    useUi.getState().back();
    expect(useUi.getState().screen).toBe('learn');
    useUi.getState().back();
    expect(useUi.getState().screen).toBe('home');
  });

  it('back on an empty stack lands on home', () => {
    useUi.getState().back();
    expect(useUi.getState().screen).toBe('home');
    expect(useUi.getState().canGoBack()).toBe(false);
  });

  it('reset clears the stack', () => {
    useUi.getState().navigate('game');
    useUi.getState().navigate('settings');
    useUi.getState().reset('home');
    expect(useUi.getState().screen).toBe('home');
    expect(useUi.getState().canGoBack()).toBe(false);
  });
});
