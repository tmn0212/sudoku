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
  /** On a row/column/box that already holds the selected digit (crossroad scan). */
  cross: boolean;
  /** A crossroad cell where the selected digit is banned — flag it red. */
  crossBanned: boolean;
  same: boolean;
  conflict: boolean;
  wrong: boolean;
  hint: boolean;
  /** Plays the "unit completed" celebration flash. */
  flash?: boolean;
  /** Plays the pop-in animation for freshly placed content. */
  pop?: boolean;
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
  cross,
  crossBanned,
  same,
  conflict,
  wrong,
  hint,
  flash,
  pop,
  noteHighlight = 0,
}: CellProps) => {
  const row = rowOf(index);
  const col = colOf(index);
  const hasMarks = (notes | notesAlt | bans) !== 0;

  const classes = ['cell'];
  if (given) classes.push('cell--given');
  // Background precedence: selected > same-number > banned-crossroad > peer >
  // crossroad. Peer beats crossroad on purpose: the selected cell's own
  // row/column/box paint the light-blue peer colour, while the crossroad lines
  // radiating from *other* copies of the digit stay amber — so you can tell your
  // cell's lines apart from the rest of the scan. Cells left untouched (plain)
  // are the candidates.
  if (selected) classes.push('cell--selected');
  else if (same) classes.push('cell--same');
  else if (crossBanned) classes.push('cell--cross-banned');
  else if (peer) classes.push('cell--peer');
  else if (cross) classes.push('cell--cross');
  if (conflict || wrong) classes.push('cell--error');
  if (hint) classes.push('cell--hint');
  if (flash) classes.push('cell--flash');
  if (pop) classes.push('cell--pop');
  if (col % 3 === 2 && col !== 8) classes.push('cell--box-right');
  if (row % 3 === 2 && row !== 8) classes.push('cell--box-bottom');

  // Diagonal wave: cells nearer the top-left fire first. Kept short so the wave
  // reads as snappy — a large stagger made the whole-board digit flash feel slow.
  const style = flash
    ? ({ '--flash-delay': `${(row + col) * 14}ms` } as CSSProperties)
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
