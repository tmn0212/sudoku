import { useMemo } from 'react';
import { CELL_COUNT, PEERS, findConflicts } from '../engine/board';
import { useGame } from '../game/store';
import { useSettings } from '../state/settingsStore';
import { Cell } from './Cell';

export const Board = () => {
  const values = useGame((s) => s.values);
  const notes = useGame((s) => s.notes);
  const given = useGame((s) => s.given);
  const solution = useGame((s) => s.solution);
  const selected = useGame((s) => s.selected);
  const autoCheck = useGame((s) => s.autoCheck);
  const hint = useGame((s) => s.hint);
  const selectCell = useGame((s) => s.selectCell);
  const highlightPeers = useSettings((s) => s.highlightPeers);
  const highlightSame = useSettings((s) => s.highlightSame);

  const conflicts = useMemo(() => findConflicts(values), [values]);
  const peerSet = useMemo(
    () =>
      selected == null || !highlightPeers
        ? new Set<number>()
        : new Set(PEERS[selected]),
    [selected, highlightPeers],
  );
  const hintCells = useMemo(() => new Set(hint?.cells ?? []), [hint]);

  const selectedValue = selected == null || !highlightSame ? 0 : values[selected];

  return (
    <div className="board" role="grid" aria-label="Sudoku board">
      {Array.from({ length: CELL_COUNT }, (_, i) => (
        <Cell
          key={i}
          index={i}
          value={values[i]}
          given={given[i]}
          notes={notes[i]}
          selected={selected === i}
          peer={peerSet.has(i)}
          same={selectedValue !== 0 && values[i] === selectedValue}
          conflict={conflicts.has(i)}
          wrong={autoCheck && !given[i] && values[i] !== 0 && values[i] !== solution[i]}
          hint={hintCells.has(i)}
          onSelect={selectCell}
        />
      ))}
    </div>
  );
};
