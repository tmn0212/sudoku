import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Board.css';
import {
  CELL_COUNT,
  PEERS,
  boxOf,
  colOf,
  findConflicts,
  hasCandidate,
  rowOf,
} from '@sudoku/core';
import { useGame } from '../game/store';
import { useFx } from '../state/fxStore';
import { useSettings } from '../state/settingsStore';
import { haptics } from '../platform/haptics';
import { Cell } from './Cell';
import { GhostLayer } from './GhostLayer';
import { RadialMenu } from './RadialMenu';
import { type RadialState } from './radial';
import {
  gestureReducer,
  initialGestureState,
  LONG_PRESS_MS,
  type GestureState,
  type GestureEvent,
} from './boardGestures';

const cellIndexFromPoint = (x: number, y: number): number | null => {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const cell = el?.closest?.('.cell') as HTMLElement | null;
  const idx = cell?.getAttribute('data-index');
  return idx == null ? null : Number(idx);
};

export const Board = () => {
  const values = useGame((s) => s.values);
  const notes = useGame((s) => s.notes);
  const notesAlt = useGame((s) => s.notesAlt);
  const bans = useGame((s) => s.bans);
  const lockedBans = useGame((s) => s.lockedBans);
  const given = useGame((s) => s.given);
  const solution = useGame((s) => s.solution);
  const selection = useGame((s) => s.selection);
  const selected = useGame((s) => s.selected);
  const autoCheck = useGame((s) => s.autoCheck);
  const mode = useGame((s) => s.mode);
  const hint = useGame((s) => s.hint);
  const setSelection = useGame((s) => s.setSelection);
  const addToSelection = useGame((s) => s.addToSelection);
  const removeFromSelection = useGame((s) => s.removeFromSelection);
  const setInputModeTransient = useGame((s) => s.setInputModeTransient);
  const cycleInputMode = useGame((s) => s.cycleInputMode);
  const highlightPeers = useSettings((s) => s.highlightPeers);
  const highlightSame = useSettings((s) => s.highlightSame);
  const highlightNotes = useSettings((s) => s.highlightNotes);
  const highlightCrosshatch = useSettings((s) => s.highlightCrosshatch);

  // The gesture *policy* is a pure reducer (boardGestures.ts); this component is
  // the web adapter — it hit-tests pointer coords to a cell, owns the long-press
  // timer, measures the radial anchor, and runs the reducer's effects. Gesture
  // state lives in a ref (only the radial drives a re-render, via setRadial).
  const gestureRef = useRef<GestureState>(initialGestureState);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [radial, setRadial] = useState<RadialState | null>(null);

  const conflicts = useMemo(() => findConflicts(values), [values]);
  const selectionSet = useMemo(() => new Set(selection), [selection]);
  // The peer / same-number / matching-note / crossroad highlights all focus on a
  // single cell, so they only apply when exactly one cell is selected. While
  // multi-selecting cells to mark notes/bans they'd scan off the last-touched
  // cell, so switch them all off.
  const single = selection.length <= 1;
  const peerSet = useMemo(
    () =>
      selected == null || !highlightPeers || !single
        ? new Set<number>()
        : new Set(PEERS[selected]),
    [selected, highlightPeers, single],
  );
  const hintCells = useMemo(() => new Set(hint?.cells ?? []), [hint]);
  const flashCells = useFx((s) => s.flashCells);
  const flashSet = useMemo(() => new Set(flashCells), [flashCells]);
  const popCells = useFx((s) => s.popCells);
  const popSet = useMemo(() => new Set(popCells), [popCells]);
  const ghosts = useFx((s) => s.ghosts);
  // The digit under the selected cell drives the same-number highlight, the
  // matching-note highlight, and the crossroad shading (each gated separately).
  // Only for a single selection — see `single` above.
  const selectedDigit = selected == null || !single ? 0 : values[selected];
  const selectedValue = highlightSame ? selectedDigit : 0;
  const noteHighlight = highlightNotes ? selectedDigit : 0;
  const checking = autoCheck || mode === 'arcade';

  // Crossroad: shade every row, column, and 3x3 box that already contains the
  // selected digit. Where none of those shaded lines cover an empty cell, that
  // digit likely goes there — the classic cross-hatching scan.
  const crossSet = useMemo(() => {
    if (!highlightCrosshatch || selectedDigit === 0) return new Set<number>();
    const rows = new Set<number>();
    const cols = new Set<number>();
    const boxes = new Set<number>();
    for (let i = 0; i < CELL_COUNT; i++) {
      if (values[i] === selectedDigit) {
        rows.add(rowOf(i));
        cols.add(colOf(i));
        boxes.add(boxOf(i));
      }
    }
    const set = new Set<number>();
    for (let i = 0; i < CELL_COUNT; i++) {
      if (rows.has(rowOf(i)) || cols.has(colOf(i)) || boxes.has(boxOf(i))) set.add(i);
    }
    return set;
  }, [highlightCrosshatch, selectedDigit, values]);

  // The selected cell's own row/column/box are the lines you're actively
  // scanning from. During a live scan they get a darker amber than the lines
  // radiating from *other* copies of the digit, so your current crosshair reads
  // apart from the rest of the scan (and no longer blends in as the light-blue
  // peer wash). Only while a scan is live (crosshatch on + a filled single
  // selection — selectedDigit is 0 otherwise).
  const crossSelfSet = useMemo(
    () =>
      selected == null || !highlightCrosshatch || selectedDigit === 0
        ? new Set<number>()
        : new Set(PEERS[selected]),
    [selected, highlightCrosshatch, selectedDigit],
  );

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // Centre of a cell in viewport coords, to anchor the radial (falls back to the
  // press origin if the element can't be measured).
  const cellCentre = (index: number): { x: number; y: number } => {
    const el = document.querySelector(`[data-index="${index}"]`);
    const r = el?.getBoundingClientRect();
    if (r) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const s = gestureRef.current;
    return { x: s.startX, y: s.startY };
  };

  // Run the reducer for one event and carry out its effects against the store,
  // the radial UI, haptics, and the long-press timer. (`dispatch` recurses only
  // via the deferred timer callback, so the self-reference is always resolved.)
  const dispatch = (event: GestureEvent) => {
    const { state, effects } = gestureReducer(gestureRef.current, event);
    gestureRef.current = state;
    for (const fx of effects) {
      switch (fx.type) {
        case 'selectSingle':
          setSelection([fx.index]);
          break;
        case 'addToSelection':
          addToSelection(fx.index);
          break;
        case 'removeFromSelection':
          removeFromSelection(fx.index);
          break;
        case 'setMode':
          setInputModeTransient(fx.mode);
          break;
        case 'cycleMode':
          cycleInputMode();
          break;
        case 'clearPressTimer':
          clearPressTimer();
          break;
        case 'startPressTimer':
          clearPressTimer();
          pressTimer.current = setTimeout(() => {
            const cell = gestureRef.current.pressCell;
            if (cell == null) return;
            const { x, y } = cellCentre(cell);
            dispatch({ type: 'pressTimerElapsed', anchorX: x, anchorY: y });
          }, LONG_PRESS_MS);
          break;
        case 'openRadial':
          setRadial({ x: fx.x, y: fx.y, active: null, deselect: fx.deselect });
          haptics.tap();
          break;
        case 'updateRadial':
          setRadial((r) => (r ? { ...r, active: fx.action } : r));
          break;
        case 'closeRadial':
          setRadial(null);
          break;
      }
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const index = cellIndexFromPoint(e.clientX, e.clientY);
    if (index == null) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const st = useGame.getState();
    // Inside an existing multi-selection? Then a hold can pick a mode without the
    // press collapsing the group (the reducer keeps it).
    const inMultiSelection = st.selection.length > 1 && st.selection.includes(index);
    // Already selected at all (single or multi)? Then a hold offers Deselect.
    const pressSelected = st.selection.includes(index);
    dispatch({
      type: 'pointerDown',
      index,
      x: e.clientX,
      y: e.clientY,
      now: Date.now(),
      inMultiSelection,
      pressSelected,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // Skip the DOM hit-test entirely while no gesture is live.
    if (gestureRef.current.phase === 'idle') return;
    const index = cellIndexFromPoint(e.clientX, e.clientY);
    dispatch({
      type: 'pointerMove',
      index,
      x: e.clientX,
      y: e.clientY,
      inputMode: useGame.getState().inputMode,
    });
  };

  const onPointerUp = () => {
    dispatch({ type: 'pointerUp', selectionCount: useGame.getState().selection.length, now: Date.now() });
  };

  const onPointerCancel = () => {
    dispatch({ type: 'pointerCancel' });
  };

  return (
    <div
      className="board"
      role="grid"
      aria-label="Sudoku board"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {Array.from({ length: CELL_COUNT }, (_, i) => (
        <Cell
          key={i}
          index={i}
          value={values[i]}
          given={given[i]}
          notes={notes[i]}
          notesAlt={notesAlt[i]}
          bans={bans[i] | lockedBans[i]}
          selected={selectionSet.has(i)}
          peer={peerSet.has(i)}
          cross={crossSet.has(i)}
          crossSelf={crossSelfSet.has(i)}
          // A ban turns red for the whole scan: EVERY cell where you've ruled the
          // scanned digit out, not only those already inside the shaded crossroad
          // — so all your eliminations for that digit read at once. Gated on the
          // scan being live (crosshatch on; selectedDigit is 0 unless a filled
          // single cell is selected), which is why crossSet.has(i) isn't needed.
          crossBanned={
            highlightCrosshatch &&
            selectedDigit !== 0 &&
            hasCandidate(bans[i] | lockedBans[i], selectedDigit)
          }
          // During a scan every already-filled cell (any digit — your fills and
          // the puzzle's givens) takes the light same-number wash, so occupied
          // cells read apart from the amber eliminated lines and the plain
          // candidate cells. Same scan gate as crossBanned.
          crossFilled={highlightCrosshatch && selectedDigit !== 0 && values[i] !== 0}
          same={selectedValue !== 0 && values[i] === selectedValue}
          conflict={conflicts.has(i)}
          wrong={checking && !given[i] && values[i] !== 0 && values[i] !== solution[i]}
          hint={hintCells.has(i)}
          flash={flashSet.has(i)}
          pop={popSet.has(i)}
          noteHighlight={noteHighlight}
        />
      ))}
      <GhostLayer ghosts={ghosts} />
      {radial && createPortal(<RadialMenu state={radial} />, document.body)}
    </div>
  );
};
