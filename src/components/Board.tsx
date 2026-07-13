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
} from '../engine/board';
import { useGame, type InputMode } from '../game/store';
import { useFx } from '../state/fxStore';
import { useSettings } from '../state/settingsStore';
import { haptics } from '../platform/haptics';
import { Cell } from './Cell';
import { GhostLayer } from './GhostLayer';
import { RadialMenu } from './RadialMenu';
import { radialModeFromPointer, type RadialState } from './radial';

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
  const setInputMode = useGame((s) => s.setInputMode);
  const cycleInputMode = useGame((s) => s.cycleInputMode);
  const highlightPeers = useSettings((s) => s.highlightPeers);
  const highlightSame = useSettings((s) => s.highlightSame);
  const highlightNotes = useSettings((s) => s.highlightNotes);
  const highlightCrosshatch = useSettings((s) => s.highlightCrosshatch);

  // Pointer gesture bookkeeping (refs so handlers don't re-create on each move).
  const gesture = useRef<'idle' | 'pending' | 'drag' | 'radial'>('idle');
  const startPos = useRef({ x: 0, y: 0 });
  const pressCell = useRef<number | null>(null);
  const lastIdx = useRef<number | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ cell: number; time: number } | null>(null);
  const radialAnchor = useRef<{ x: number; y: number } | null>(null);
  const radialMode = useRef<InputMode | null>(null);
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

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // Hold-to-open radial mode picker, anchored on the pressed cell.
  const openRadial = (idx: number) => {
    const el = document.querySelector(`[data-index="${idx}"]`);
    const r = el?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : startPos.current.x;
    const y = r ? r.top + r.height / 2 : startPos.current.y;
    gesture.current = 'radial';
    radialAnchor.current = { x, y };
    radialMode.current = null;
    setRadial({ x, y, active: null });
    haptics.tap();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const idx = cellIndexFromPoint(e.clientX, e.clientY);
    if (idx == null) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    // Double-tap the current single cell to cycle Digit -> Notes -> Notes 2 -> Ban.
    const tap = lastTap.current;
    if (tap && tap.cell === idx && Date.now() - tap.time < 320) {
      lastTap.current = null;
      gesture.current = 'idle';
      setSelection([idx]);
      cycleInputMode();
      return;
    }
    startPos.current = { x: e.clientX, y: e.clientY };
    pressCell.current = idx;
    lastIdx.current = idx;
    gesture.current = 'pending';
    // Keep an existing multi-selection when the press lands inside it (so you can
    // hold it to pick a mode); otherwise start a fresh single selection.
    const st = useGame.getState();
    if (!(st.selection.length > 1 && st.selection.includes(idx))) setSelection([idx]);
    clearPressTimer();
    pressTimer.current = setTimeout(() => {
      if (gesture.current === 'pending') openRadial(idx);
    }, 450);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (gesture.current === 'idle') return;
    if (gesture.current === 'radial') {
      const m = radialModeFromPointer(radialAnchor.current, e.clientX, e.clientY);
      if (m !== radialMode.current) {
        radialMode.current = m;
        setRadial((r) => (r ? { ...r, active: m } : r));
      }
      return;
    }
    // A real drag (moved past a small threshold) becomes a multi-select.
    if (gesture.current === 'pending') {
      const moved = Math.hypot(
        e.clientX - startPos.current.x,
        e.clientY - startPos.current.y,
      );
      if (moved < 8) return;
      gesture.current = 'drag';
      clearPressTimer();
    }
    const idx = cellIndexFromPoint(e.clientX, e.clientY);
    if (idx == null || idx === lastIdx.current) return;
    lastIdx.current = idx;
    // Placing final digits across a drag makes no sense, but marking a run of
    // cells does: a drag that starts in Digit mode auto-switches to Notes.
    if (useGame.getState().inputMode === 'normal') setInputMode('note');
    addToSelection(idx);
  };

  const onPointerUp = () => {
    clearPressTimer();
    const g = gesture.current;
    gesture.current = 'idle';
    if (g === 'radial') {
      if (radialMode.current) setInputMode(radialMode.current);
      radialAnchor.current = null;
      radialMode.current = null;
      setRadial(null);
      return;
    }
    if (g === 'pending' && pressCell.current != null) {
      // A plain tap resolves to just the pressed cell, even when it lands inside
      // a multi-selection. (A hold on the group opens the radial in the branch
      // above, which keeps the whole selection for mode-picking.)
      if (useGame.getState().selection.length > 1) setSelection([pressCell.current]);
      lastTap.current = { cell: pressCell.current, time: Date.now() };
    }
  };

  const onPointerCancel = () => {
    clearPressTimer();
    gesture.current = 'idle';
    radialAnchor.current = null;
    radialMode.current = null;
    setRadial(null);
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
          crossBanned={
            crossSet.has(i) &&
            selectedDigit !== 0 &&
            hasCandidate(bans[i] | lockedBans[i], selectedDigit)
          }
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
