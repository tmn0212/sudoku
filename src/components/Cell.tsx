import { memo, type CSSProperties } from 'react';
import { colOf, hasCandidate, rowOf } from '../engine/board';

export interface CellProps {
  index: number;
  value: number;
  given: boolean;
  /** Blue pencil marks (candidate bitmask). */
  notes: number;
  /** Grey pencil marks. */
  notesAlt: number;
  /** Red "cannot be" marks. */
  bans: number;
  selected: boolean;
  peer: boolean;
  same: boolean;
  conflict: boolean;
  wrong: boolean;
  hint: boolean;
  /** Plays the "unit completed" celebration flash. */
  flash?: boolean;
  /** When set, this digit's matching pencil mark is highlighted (0 = off). */
  noteHighlight?: number;
}

const noteClass = (notes: number, notesAlt: number, bans: number, n: number): string => {
  // Priority: a ban (you decided it's impossible) wins visually.
  if (hasCandidate(bans, n)) return 'cell__note--ban';
  if (hasCandidate(notes, n)) return 'cell__note--blue';
  if (hasCandidate(notesAlt, n)) return 'cell__note--grey';
  return '';
};

const CellComponent = ({
  index,
  value,
  given,
  notes,
  notesAlt,
  bans,
  selected,
  peer,
  same,
  conflict,
  wrong,
  hint,
  flash,
  noteHighlight = 0,
}: CellProps) => {
  const row = rowOf(index);
  const col = colOf(index);
  const hasMarks = (notes | notesAlt | bans) !== 0;

  const classes = ['cell'];
  if (given) classes.push('cell--given');
  if (selected) classes.push('cell--selected');
  else if (peer) classes.push('cell--peer');
  if (same && !selected) classes.push('cell--same');
  if (conflict || wrong) classes.push('cell--error');
  if (hint) classes.push('cell--hint');
  if (flash) classes.push('cell--flash');
  if (col % 3 === 2 && col !== 8) classes.push('cell--box-right');
  if (row % 3 === 2 && row !== 8) classes.push('cell--box-bottom');

  // Diagonal wave: cells nearer the top-left of the completed unit fire first.
  const style = flash
    ? ({ '--flash-delay': `${(row + col) * 26}ms` } as CSSProperties)
    : undefined;

  return (
    <div
      className={classes.join(' ')}
      style={style}
      role="gridcell"
      data-index={index}
      data-testid={`cell-${index}`}
      aria-label={`Row ${row + 1} column ${col + 1}${value ? `, ${value}` : ', empty'}`}
    >
      {value !== 0 ? (
        <span className="cell__value">{value}</span>
      ) : hasMarks ? (
        <span className="cell__notes" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => {
            const cls = noteClass(notes, notesAlt, bans, n);
            const match = cls !== '' && n === noteHighlight;
            return (
              <span
                key={n}
                className={`cell__note ${cls}${match ? ' cell__note--match' : ''}`}
              >
                {cls ? n : ''}
              </span>
            );
          })}
        </span>
      ) : null}
    </div>
  );
};

export const Cell = memo(CellComponent);
