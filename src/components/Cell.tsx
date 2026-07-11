import { memo } from 'react';
import { candidatesToArray, colOf, rowOf } from '../engine/board';

export interface CellProps {
  index: number;
  value: number;
  given: boolean;
  notes: number;
  selected: boolean;
  /** In the same row, column, or box as the selected cell. */
  peer: boolean;
  /** Same digit as the selected cell (highlighted like Good Sudoku). */
  same: boolean;
  /** Duplicates a peer's digit. */
  conflict: boolean;
  /** Auto-check flagged this entry as wrong. */
  wrong: boolean;
  /** Part of the current hint. */
  hint: boolean;
  onSelect: (index: number) => void;
}

const CellComponent = ({
  index,
  value,
  given,
  notes,
  selected,
  peer,
  same,
  conflict,
  wrong,
  hint,
  onSelect,
}: CellProps) => {
  const row = rowOf(index);
  const col = colOf(index);

  const classes = ['cell'];
  if (given) classes.push('cell--given');
  if (selected) classes.push('cell--selected');
  else if (peer) classes.push('cell--peer');
  if (same && !selected) classes.push('cell--same');
  if (conflict || wrong) classes.push('cell--error');
  if (hint) classes.push('cell--hint');
  if (col % 3 === 2 && col !== 8) classes.push('cell--box-right');
  if (row % 3 === 2 && row !== 8) classes.push('cell--box-bottom');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      onClick={() => onSelect(index)}
      aria-label={`Cell row ${row + 1} column ${col + 1}${value ? `, ${value}` : ', empty'}`}
      data-testid={`cell-${index}`}
    >
      {value !== 0 ? (
        <span className="cell__value">{value}</span>
      ) : notes !== 0 ? (
        <span className="cell__notes" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
            <span key={n} className="cell__note">
              {candidatesToArray(notes).includes(n) ? n : ''}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
};

export const Cell = memo(CellComponent);
