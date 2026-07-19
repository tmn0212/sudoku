/**
 * Board gesture policy — a pure, framework-agnostic reducer for the board's
 * pointer interactions (tap, double-tap-to-cycle-mode, drag-to-multi-select, and
 * hold-to-open the radial mode picker).
 *
 * All DOM plumbing stays in Board.tsx (the host): it hit-tests pointer coords to a
 * cell index, measures the held cell's rect for the radial anchor, owns the
 * long-press timer, and captures the pointer. The host feeds this reducer
 * already-normalized events and carries out the returned effects. That keeps the
 * fiddly interaction *policy* — the 450ms long-press, the 8px drag threshold, the
 * 320ms double-tap window, the idle/pending/drag/radial state machine — unit
 * testable without jsdom, and swappable for measured-rect hit-testing in RN.
 */

import type { InputMode } from '../game/store';
import { radialActionFromPointer, type RadialAction } from './radial';

/** How long a hold must last (ms) before the radial mode picker opens. The host
 *  owns the actual timer; this is exported so both agree on the duration. */
export const LONG_PRESS_MS = 450;
/** A second tap on the same cell within this window (ms) cycles the input mode. */
export const DOUBLE_TAP_MS = 320;
/** Pointer travel (px) past which a press becomes a drag-multi-select. */
export const DRAG_THRESHOLD_PX = 8;

export type GesturePhase = 'idle' | 'pending' | 'drag' | 'radial';

export interface GestureState {
  phase: GesturePhase;
  /** Where the current press started (for the drag threshold). */
  startX: number;
  startY: number;
  /** The cell the press landed on (drives tap resolution + the radial anchor). */
  pressCell: number | null;
  /** Last cell the drag visited, so re-entering it doesn't re-add it. */
  lastIdx: number | null;
  /** The previous tap, for double-tap detection. */
  lastTap: { cell: number; time: number } | null;
  /** Whether the press landed on an already-selected cell (single or multi) —
   *  gates whether the radial offers the "deselect this cell" option. A hold on
   *  a fresh cell keeps the plain four-mode radial. Set on pointerDown. */
  pressSelected: boolean;
  /** Radial anchor (held-cell centre, viewport coords) while phase === 'radial'. */
  radialAnchor: { x: number; y: number } | null;
  /** Action currently under the finger in the radial (null = dead zone / cancel). */
  radialAction: RadialAction | null;
}

export const initialGestureState: GestureState = {
  phase: 'idle',
  startX: 0,
  startY: 0,
  pressCell: null,
  lastIdx: null,
  lastTap: null,
  pressSelected: false,
  radialAnchor: null,
  radialAction: null,
};

/** Intents the host carries out against the store / radial UI / long-press timer. */
export type GestureEffect =
  | { type: 'selectSingle'; index: number }
  | { type: 'addToSelection'; index: number }
  /** Drop one cell from the multi-selection (radial "Deselect"). */
  | { type: 'removeFromSelection'; index: number }
  | { type: 'setMode'; mode: InputMode }
  | { type: 'cycleMode' }
  | { type: 'startPressTimer' }
  | { type: 'clearPressTimer' }
  /** Open the radial at (x,y): host shows it and fires a haptic tap. `deselect`
   *  is whether the held cell was already selected (offers the extra option). */
  | { type: 'openRadial'; x: number; y: number; deselect: boolean }
  | { type: 'updateRadial'; action: RadialAction | null }
  | { type: 'closeRadial' };

/** Events the host feeds in, already hit-tested / measured. */
export type GestureEvent =
  /** Pointer down. `index` is the hit-tested cell (null = off the grid).
   *  `inMultiSelection` is true when the press lands inside an existing
   *  multi-selection (so a hold can pick a mode without collapsing it).
   *  `pressSelected` is true when the press lands on any already-selected cell
   *  (single or multi) — it gates the radial's Deselect option. */
  | {
      type: 'pointerDown';
      index: number | null;
      x: number;
      y: number;
      now: number;
      inMultiSelection: boolean;
      pressSelected: boolean;
    }
  /** The long-press timer elapsed; `anchor*` is the held cell's measured centre. */
  | { type: 'pressTimerElapsed'; anchorX: number; anchorY: number }
  /** Pointer move. `index` is the hit-tested cell under the finger (null = none). */
  | { type: 'pointerMove'; index: number | null; x: number; y: number; inputMode: InputMode }
  | { type: 'pointerUp'; selectionCount: number; now: number }
  | { type: 'pointerCancel' };

interface Result {
  state: GestureState;
  effects: GestureEffect[];
}

const noChange = (state: GestureState): Result => ({ state, effects: [] });

/**
 * The single source of truth for board gesture transitions. Pure: same
 * (state, event) always yields the same (next state, effects).
 */
export const gestureReducer = (state: GestureState, event: GestureEvent): Result => {
  switch (event.type) {
    case 'pointerDown': {
      const { index, x, y, now, inMultiSelection, pressSelected } = event;
      if (index == null) return noChange(state);

      // Double-tap the same cell → cycle the input mode. The selection is left
      // to the store's cycle, which keeps a multi-selection (showing only its
      // first cell while the cycle sits on Digit) instead of collapsing it here.
      const tap = state.lastTap;
      if (tap && tap.cell === index && now - tap.time < DOUBLE_TAP_MS) {
        return {
          state: { ...state, phase: 'idle', lastTap: null },
          effects: [{ type: 'cycleMode' }],
        };
      }

      const effects: GestureEffect[] = [];
      // Fresh single selection unless the press is inside an existing group.
      if (!inMultiSelection) effects.push({ type: 'selectSingle', index });
      effects.push({ type: 'startPressTimer' });
      return {
        state: {
          ...state,
          phase: 'pending',
          startX: x,
          startY: y,
          pressCell: index,
          lastIdx: index,
          pressSelected,
        },
        effects,
      };
    }

    case 'pressTimerElapsed': {
      // Ignore a stale timer if the gesture already moved on (drag / lifted).
      if (state.phase !== 'pending') return noChange(state);
      return {
        state: {
          ...state,
          phase: 'radial',
          radialAnchor: { x: event.anchorX, y: event.anchorY },
          radialAction: null,
        },
        effects: [
          { type: 'openRadial', x: event.anchorX, y: event.anchorY, deselect: state.pressSelected },
        ],
      };
    }

    case 'pointerMove': {
      const { index, x, y, inputMode } = event;
      if (state.phase === 'idle') return noChange(state);

      if (state.phase === 'radial') {
        const action = radialActionFromPointer(state.radialAnchor, x, y, state.pressSelected);
        if (action === state.radialAction) return noChange(state);
        return { state: { ...state, radialAction: action }, effects: [{ type: 'updateRadial', action }] };
      }

      let next = state;
      const effects: GestureEffect[] = [];

      // A press that travels past the threshold becomes a drag-multi-select.
      if (next.phase === 'pending') {
        const moved = Math.hypot(x - next.startX, y - next.startY);
        if (moved < DRAG_THRESHOLD_PX) return noChange(state);
        next = { ...next, phase: 'drag' };
        effects.push({ type: 'clearPressTimer' });
      }

      // Drag entered a new cell → extend the selection (a drag from Digit mode
      // switches to Notes, since dragging in final digits makes no sense).
      if (index == null || index === next.lastIdx) return { state: next, effects };
      next = { ...next, lastIdx: index };
      if (inputMode === 'normal') effects.push({ type: 'setMode', mode: 'note' });
      effects.push({ type: 'addToSelection', index });
      return { state: next, effects };
    }

    case 'pointerUp': {
      const g = state.phase;
      const base: GestureState = { ...state, phase: 'idle' };
      const effects: GestureEffect[] = [{ type: 'clearPressTimer' }];

      if (g === 'radial') {
        const action = state.radialAction;
        if (action === 'deselect') {
          if (state.pressCell != null) {
            effects.push({ type: 'removeFromSelection', index: state.pressCell });
          }
        } else if (action) {
          effects.push({ type: 'setMode', mode: action });
        }
        effects.push({ type: 'closeRadial' });
        return { state: { ...base, radialAnchor: null, radialAction: null }, effects };
      }

      if (g === 'pending' && state.pressCell != null) {
        // A plain tap resolves to just the pressed cell, even inside a group.
        if (event.selectionCount > 1) effects.push({ type: 'selectSingle', index: state.pressCell });
        return { state: { ...base, lastTap: { cell: state.pressCell, time: event.now } }, effects };
      }

      return { state: base, effects };
    }

    case 'pointerCancel':
      return {
        state: { ...state, phase: 'idle', radialAnchor: null, radialAction: null },
        effects: [{ type: 'clearPressTimer' }, { type: 'closeRadial' }],
      };
  }
};
