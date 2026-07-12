import { useMemo, useRef } from 'react';
import { CELL_COUNT, PEERS, findConflicts } from '../engine/board';
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
  const highlightPeers = useSettings((s) => s.highlightPeers);
  const highlightSame = useSettings((s) => s.highlightSame);
  const highlightNotes = useSettings((s) => s.highlightNotes);

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
  // The digit under the selected cell drives both the same-number highlight
  // and the matching-note highlight (each gated by its own setting).
  const selectedDigit = selected == null ? 0 : values[selected];
  const selectedValue = highlightSame ? selectedDigit : 0;
  const noteHighlight = highlightNotes ? selectedDigit : 0;
  const checking = autoCheck || mode === 'arcade';

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
