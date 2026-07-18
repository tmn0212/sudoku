import { memo, type CSSProperties } from 'react';
import { colOf, hasCandidate, rowOf } from '@sudoku/core';
import type { Ghost } from '../state/fxStore';

const noteClass = (notes: number, notesAlt: number, bans: number, n: number): string => {
  if (hasCandidate(bans, n)) return 'cell__note--ban';
  if (hasCandidate(notes, n)) return 'cell__note--blue';
  if (hasCandidate(notesAlt, n)) return 'cell__note--grey';
  return '';
};

const GhostView = ({ g }: { g: Ghost }) => {
  const style: CSSProperties = {
    left: `${(colOf(g.cell) / 9) * 100}%`,
    top: `${(rowOf(g.cell) / 9) * 100}%`,
  };
  return (
    <div
      className={`board__ghost${g.wrong ? ' board__ghost--wrong' : ''}${
        g.bounce ? ' board__ghost--bounce' : ''
      }`}
      style={style}
    >
      {g.value !== 0 ? (
        <span className="cell__value">{g.value}</span>
      ) : (
        <span className="cell__notes">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => {
            const cls = noteClass(g.notes, g.notesAlt, g.bans, n);
            return (
              <span key={n} className={`cell__note ${cls}`}>
                {cls ? n : ''}
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
};

/**
 * Overlays fading "ghosts" of content that just left a cell, so an erase (or the
 * auto-ban of a wrong entry) pops out instead of vanishing instantly. Sits above
 * the grid and ignores pointer events.
 */
const GhostLayerComponent = ({ ghosts }: { ghosts: Ghost[] }) => {
  if (ghosts.length === 0) return null;
  return (
    <div className="board__ghosts" aria-hidden="true">
      {ghosts.map((g) => (
        <GhostView key={g.id} g={g} />
      ))}
    </div>
  );
};

export const GhostLayer = memo(GhostLayerComponent);
