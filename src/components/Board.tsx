import { useMemo, useRef } from 'react';
import { CELL_COUNT, PEERS, boxOf, colOf, findConflicts, rowOf } from '../engine/board';
import { useGame } from '../game/store';
import { useFx } from '../state/fxStore';
import { useSettings } from '../state/settingsStore';
import { Cell } from './Cell';

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
  const highlightPeers = useSettings((s) => s.highlightPeers);
  const highlightSame = useSettings((s) => s.highlightSame);
  const highlightNotes = useSettings((s) => s.highlightNotes);
  const highlightCrosshatch = useSettings((s) => s.highlightCrosshatch);

  const dragging = useRef(false);
  const lastIdx = useRef<number | null>(null);

  const conflicts = useMemo(() => findConflicts(values), [values]);
  const selectionSet = useMemo(() => new Set(selection), [selection]);
  const peerSet = useMemo(
    () =>
      selected == null || !highlightPeers
        ? new Set<number>()
        : new Set(PEERS[selected]),
    [selected, highlightPeers],
  );
  const hintCells = useMemo(() => new Set(hint?.cells ?? []), [hint]);
  const flashCells = useFx((s) => s.flashCells);
  const flashSet = useMemo(() => new Set(flashCells), [flashCells]);
  // The digit under the selected cell drives the same-number highlight, the
  // matching-note highlight, and the crossroad shading (each gated separately).
  const selectedDigit = selected == null ? 0 : values[selected];
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

  const onPointerDown = (e: React.PointerEvent) => {
    const idx = cellIndexFromPoint(e.clientX, e.clientY);
    if (idx == null) return;
    dragging.current = true;
    lastIdx.current = idx;
    setSelection([idx]);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const idx = cellIndexFromPoint(e.clientX, e.clientY);
    if (idx == null || idx === lastIdx.current) return;
    lastIdx.current = idx;
    // Placing final digits across a drag makes no sense, but marking a run of
    // cells does: a drag that starts in Digit mode auto-switches to Notes so the
    // multi-selection is useful. Notes/Notes 2/Ban just keep accumulating.
    if (useGame.getState().inputMode === 'normal') setInputMode('note');
    addToSelection(idx);
  };

  const endDrag = () => {
    dragging.current = false;
  };

  return (
    <div
      className="board"
      role="grid"
      aria-label="Sudoku board"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {Array.from({ length: CELL_COUNT }, (_, i) => (
        <Cell
          key={i}
          index={i}
          value={values[i]}
          given={given[i]}
          notes={notes[i]}
          notesAlt={notesAlt[i]}
          bans={bans[i]}
          selected={selectionSet.has(i)}
          peer={peerSet.has(i)}
          cross={crossSet.has(i)}
          same={selectedValue !== 0 && values[i] === selectedValue}
          conflict={conflicts.has(i)}
          wrong={checking && !given[i] && values[i] !== 0 && values[i] !== solution[i]}
          hint={hintCells.has(i)}
          flash={flashSet.has(i)}
          noteHighlight={noteHighlight}
        />
      ))}
    </div>
  );
};
