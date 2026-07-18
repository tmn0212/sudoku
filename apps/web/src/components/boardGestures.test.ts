import { describe, it, expect } from 'vitest';
import {
  gestureReducer,
  initialGestureState,
  type GestureState,
  type GestureEvent,
  type GestureEffect,
  DOUBLE_TAP_MS,
  DRAG_THRESHOLD_PX,
} from './boardGestures';

const S = (over: Partial<GestureState> = {}): GestureState => ({ ...initialGestureState, ...over });

/** Run a sequence of events, returning the final state and the flattened effects. */
const run = (start: GestureState, ...events: GestureEvent[]) => {
  let state = start;
  const effects: GestureEffect[] = [];
  for (const e of events) {
    const r = gestureReducer(state, e);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
};

describe('gestureReducer — pointerDown', () => {
  it('ignores a press off the grid', () => {
    const r = gestureReducer(S(), { type: 'pointerDown', index: null, x: 0, y: 0, now: 0, inMultiSelection: false });
    expect(r.state).toEqual(S());
    expect(r.effects).toEqual([]);
  });

  it('starts a pending press: single-selects the cell and arms the long-press timer', () => {
    const r = gestureReducer(S(), { type: 'pointerDown', index: 42, x: 5, y: 6, now: 100, inMultiSelection: false });
    expect(r.state.phase).toBe('pending');
    expect(r.state).toMatchObject({ startX: 5, startY: 6, pressCell: 42, lastIdx: 42 });
    expect(r.effects).toEqual([{ type: 'selectSingle', index: 42 }, { type: 'startPressTimer' }]);
  });

  it('does NOT collapse an existing multi-selection when the press lands inside it', () => {
    const r = gestureReducer(S(), { type: 'pointerDown', index: 42, x: 5, y: 6, now: 100, inMultiSelection: true });
    expect(r.state.phase).toBe('pending');
    expect(r.effects).toEqual([{ type: 'startPressTimer' }]); // no selectSingle
  });
});

describe('gestureReducer — double-tap to cycle mode', () => {
  it('cycles the mode on a second tap of the same cell within the window', () => {
    const withTap = S({ lastTap: { cell: 7, time: 1000 } });
    const r = gestureReducer(withTap, {
      type: 'pointerDown', index: 7, x: 0, y: 0, now: 1000 + DOUBLE_TAP_MS - 1, inMultiSelection: false,
    });
    expect(r.state.phase).toBe('idle');
    expect(r.state.lastTap).toBeNull();
    // No selectSingle: the store's cycle preserves a multi-selection.
    expect(r.effects).toEqual([{ type: 'cycleMode' }]);
  });

  it('treats a too-slow second tap as a fresh press, not a double-tap', () => {
    const withTap = S({ lastTap: { cell: 7, time: 1000 } });
    const r = gestureReducer(withTap, {
      type: 'pointerDown', index: 7, x: 0, y: 0, now: 1000 + DOUBLE_TAP_MS, inMultiSelection: false,
    });
    expect(r.state.phase).toBe('pending');
    expect(r.effects).toContainEqual({ type: 'startPressTimer' });
  });

  it('treats a tap on a different cell as a fresh press', () => {
    const withTap = S({ lastTap: { cell: 7, time: 1000 } });
    const r = gestureReducer(withTap, { type: 'pointerDown', index: 8, x: 0, y: 0, now: 1050, inMultiSelection: false });
    expect(r.state.phase).toBe('pending');
    expect(r.effects).toContainEqual({ type: 'selectSingle', index: 8 });
  });

  it('round-trips a real down/up/down double-tap sequence', () => {
    // down -> up records lastTap; a quick down on the same cell double-taps.
    const { state, effects } = run(
      S(),
      { type: 'pointerDown', index: 3, x: 0, y: 0, now: 0, inMultiSelection: false },
      { type: 'pointerUp', selectionCount: 1, now: 10 },
      { type: 'pointerDown', index: 3, x: 0, y: 0, now: 20, inMultiSelection: false },
    );
    expect(state.phase).toBe('idle');
    expect(effects).toContainEqual({ type: 'cycleMode' });
  });
});

describe('gestureReducer — long-press opens the radial', () => {
  it('opens the radial when the timer elapses while still pending', () => {
    const pending = S({ phase: 'pending', pressCell: 5, startX: 50, startY: 50 });
    const r = gestureReducer(pending, { type: 'pressTimerElapsed', anchorX: 55, anchorY: 60 });
    expect(r.state.phase).toBe('radial');
    expect(r.state.radialAnchor).toEqual({ x: 55, y: 60 });
    expect(r.effects).toEqual([{ type: 'openRadial', x: 55, y: 60 }]);
  });

  it('ignores a stale timer once the gesture became a drag', () => {
    const dragging = S({ phase: 'drag' });
    const r = gestureReducer(dragging, { type: 'pressTimerElapsed', anchorX: 1, anchorY: 2 });
    expect(r.state).toEqual(dragging);
    expect(r.effects).toEqual([]);
  });
});

describe('gestureReducer — drag to multi-select', () => {
  const pending = S({ phase: 'pending', pressCell: 0, lastIdx: 0, startX: 100, startY: 100 });

  it('does nothing until the pointer travels past the drag threshold', () => {
    const r = gestureReducer(pending, {
      type: 'pointerMove', index: 1, x: 100 + DRAG_THRESHOLD_PX - 1, y: 100, inputMode: 'normal',
    });
    expect(r.state.phase).toBe('pending');
    expect(r.effects).toEqual([]);
  });

  it('becomes a drag past the threshold: clears the timer, switches Digit->Notes, extends selection', () => {
    const r = gestureReducer(pending, {
      type: 'pointerMove', index: 1, x: 120, y: 100, inputMode: 'normal',
    });
    expect(r.state.phase).toBe('drag');
    expect(r.state.lastIdx).toBe(1);
    expect(r.effects).toEqual([
      { type: 'clearPressTimer' },
      { type: 'setMode', mode: 'note' },
      { type: 'addToSelection', index: 1 },
    ]);
  });

  it('on the transition move, does not re-add the origin cell', () => {
    const r = gestureReducer(pending, {
      type: 'pointerMove', index: 0, x: 120, y: 100, inputMode: 'note',
    });
    expect(r.state.phase).toBe('drag');
    expect(r.effects).toEqual([{ type: 'clearPressTimer' }]); // index === lastIdx (0)
  });

  it('while already dragging in a note mode, extends without re-switching mode', () => {
    const dragging = S({ phase: 'drag', lastIdx: 1, startX: 100, startY: 100 });
    const r = gestureReducer(dragging, { type: 'pointerMove', index: 2, x: 140, y: 100, inputMode: 'note' });
    expect(r.effects).toEqual([{ type: 'addToSelection', index: 2 }]); // no setMode
    expect(r.state.lastIdx).toBe(2);
  });

  it('re-entering the same cell during a drag is a no-op', () => {
    const dragging = S({ phase: 'drag', lastIdx: 2, startX: 100, startY: 100 });
    const r = gestureReducer(dragging, { type: 'pointerMove', index: 2, x: 140, y: 100, inputMode: 'note' });
    expect(r.effects).toEqual([]);
  });

  it('ignores moves while idle', () => {
    const r = gestureReducer(S(), { type: 'pointerMove', index: 5, x: 0, y: 0, inputMode: 'normal' });
    expect(r.effects).toEqual([]);
  });
});

describe('gestureReducer — radial tracking + commit', () => {
  const radial = S({ phase: 'radial', radialAnchor: { x: 100, y: 100 }, radialMode: null });

  it('updates the highlighted mode as the finger moves into a sector', () => {
    // straight up from the anchor = Digit ('normal')
    const r = gestureReducer(radial, { type: 'pointerMove', index: null, x: 100, y: 40, inputMode: 'note' });
    expect(r.state.radialMode).toBe('normal');
    expect(r.effects).toEqual([{ type: 'updateRadial', mode: 'normal' }]);
  });

  it('does not re-emit when the sector is unchanged', () => {
    const onNormal = S({ ...radial, radialMode: 'normal' });
    const r = gestureReducer(onNormal, { type: 'pointerMove', index: null, x: 100, y: 40, inputMode: 'note' });
    expect(r.effects).toEqual([]);
  });

  it('commits the highlighted mode on release', () => {
    const onBan = S({ ...radial, radialMode: 'ban' });
    const r = gestureReducer(onBan, { type: 'pointerUp', selectionCount: 3, now: 0 });
    expect(r.state.phase).toBe('idle');
    expect(r.state.radialAnchor).toBeNull();
    expect(r.effects).toEqual([
      { type: 'clearPressTimer' },
      { type: 'setMode', mode: 'ban' },
      { type: 'closeRadial' },
    ]);
  });

  it('just closes (no mode change) when released in the dead zone', () => {
    const r = gestureReducer(radial, { type: 'pointerUp', selectionCount: 1, now: 0 });
    expect(r.effects).toEqual([{ type: 'clearPressTimer' }, { type: 'closeRadial' }]);
  });
});

describe('gestureReducer — pointerUp tap resolution', () => {
  it('collapses a multi-selection to the pressed cell on a plain tap, and records the tap', () => {
    const pending = S({ phase: 'pending', pressCell: 9 });
    const r = gestureReducer(pending, { type: 'pointerUp', selectionCount: 4, now: 500 });
    expect(r.state.phase).toBe('idle');
    expect(r.state.lastTap).toEqual({ cell: 9, time: 500 });
    expect(r.effects).toEqual([{ type: 'clearPressTimer' }, { type: 'selectSingle', index: 9 }]);
  });

  it('records the tap without re-selecting when only one cell is selected', () => {
    const pending = S({ phase: 'pending', pressCell: 9 });
    const r = gestureReducer(pending, { type: 'pointerUp', selectionCount: 1, now: 500 });
    expect(r.effects).toEqual([{ type: 'clearPressTimer' }]);
    expect(r.state.lastTap).toEqual({ cell: 9, time: 500 });
  });

  it('a released drag just clears the timer and does not record a tap', () => {
    const dragging = S({ phase: 'drag', pressCell: 9, lastTap: null });
    const r = gestureReducer(dragging, { type: 'pointerUp', selectionCount: 5, now: 500 });
    expect(r.state.phase).toBe('idle');
    expect(r.state.lastTap).toBeNull();
    expect(r.effects).toEqual([{ type: 'clearPressTimer' }]);
  });
});

describe('gestureReducer — pointerCancel', () => {
  it('resets to idle and tears down the radial', () => {
    const radial = S({ phase: 'radial', radialAnchor: { x: 1, y: 2 }, radialMode: 'ban' });
    const r = gestureReducer(radial, { type: 'pointerCancel' });
    expect(r.state).toMatchObject({ phase: 'idle', radialAnchor: null, radialMode: null });
    expect(r.effects).toEqual([{ type: 'clearPressTimer' }, { type: 'closeRadial' }]);
  });
});
