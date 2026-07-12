import { useMemo } from 'react';
import {
  computeCandidates,
  candidatesToArray,
  rowOf,
  colOf,
} from '../engine/board';
import type { CandidateMask, Grid } from '../engine/types';

export interface CellMark {
  cell: number;
  value: number;
}

interface LessonBoardProps {
  /** Values-only board (0 = empty). */
  grid: Grid;
  /** Explicit pencil-mark state; falls back to computed candidates if omitted. */
  candidateMasks?: CandidateMask[];
  /** Cells to emphasise as part of the deduction (ringed). */
  highlights?: number[];
  /** Cells to tint softly, like the peers/same-number highlight in play. */
  peers?: number[];
  /** Placements to reveal (shown as a bold accent digit). */
  placements?: CellMark[];
  /** Candidate eliminations to reveal (shown struck through in red). */
  eliminations?: CellMark[];
  /** When false, the board shows only the setup (no answer revealed). */
  revealed?: boolean;
}

/** A static, read-only board for teaching — not wired to the game store. */
export const LessonBoard = ({
  grid,
  candidateMasks,
  highlights = [],
  peers = [],
  placements = [],
  eliminations = [],
  revealed = false,
}: LessonBoardProps) => {
  const candidates = useMemo(
    () => candidateMasks ?? computeCandidates(grid),
    [candidateMasks, grid],
  );
  const highlightSet = useMemo(() => new Set(highlights), [highlights]);
  const peerSet = useMemo(() => new Set(peers), [peers]);
  const placeMap = useMemo(
    () => new Map(placements.map((p) => [p.cell, p.value])),
    [placements],
  );
  const elimSet = useMemo(
    () => new Set(eliminations.map((e) => `${e.cell}:${e.value}`)),
    [eliminations],
  );

  return (
    <div className="lboard" role="img" aria-label="Sudoku lesson board">
      {grid.map((value, i) => {
        const r = rowOf(i);
        const c = colOf(i);
        const classes = ['lboard__cell'];
        if (peerSet.has(i)) classes.push('lboard__cell--peer');
        if (highlightSet.has(i)) classes.push('lboard__cell--hl');
        // Thick separators only between boxes (not against the outer frame).
        if (r % 3 === 0 && r !== 0) classes.push('lboard__cell--top');
        if (c % 3 === 0 && c !== 0) classes.push('lboard__cell--left');
        if (r === 8) classes.push('lboard__cell--bottom');
        if (c === 8) classes.push('lboard__cell--right');

        const placed = revealed ? placeMap.get(i) : undefined;

        return (
          <div key={i} className={classes.join(' ')}>
            {value !== 0 ? (
              <span className="lboard__value">{value}</span>
            ) : placed ? (
              <span className="lboard__value lboard__value--place">{placed}</span>
            ) : (
              <span className="lboard__notes">
                {candidatesToArray(candidates[i]).map((n) => {
                  const struck = revealed && elimSet.has(`${i}:${n}`);
                  return (
                    <span
                      key={n}
                      className={`lboard__note${struck ? ' lboard__note--elim' : ''}`}
                      style={{ gridArea: `${Math.floor((n - 1) / 3) + 1} / ${((n - 1) % 3) + 1}` }}
                    >
                      {n}
                    </span>
                  );
                })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
