import type { InputMode } from '../game/store';

/** A radial pick: one of the input modes, or the contextual "deselect this cell"
 *  (offered only when the held cell is part of a multi-selection). */
export type RadialAction = InputMode | 'deselect';

export interface RadialState {
  /** Anchor point (viewport coords) — the centre of the held cell. */
  x: number;
  y: number;
  /** Action currently under the finger (null = in the dead zone / cancel). */
  active: RadialAction | null;
  /** Whether the Deselect option is drawn (held cell was in a multi-selection). */
  deselect: boolean;
}

/** Each option's icon direction, as an atan2 angle in degrees (0 = right,
 *  90 = down, -90 = up). These match the positions drawn by RadialMenu. */
const ANGLE: Record<RadialAction, number> = {
  normal: -90, // up
  note: 0, // right
  noteAlt: 90, // down
  deselect: 135, // down-left (contextual)
  ban: 180, // left
};

const MODES: RadialAction[] = ['normal', 'note', 'noteAlt', 'ban'];

/** Smallest absolute angle (deg) between two directions, wrap-aware. */
const angularGap = (a: number, b: number): number =>
  Math.abs(((((a - b) % 360) + 540) % 360) - 180);

/**
 * Maps the pointer position (relative to the anchor) to the nearest option, or
 * null when it's still inside the central dead zone. Selection is a Voronoi
 * split by icon direction: with `allowDeselect` the down-left Deselect option
 * joins the four modes; without it the four modes keep their original quadrants
 * (up = Digit, right = Notes, down = Notes 2, left = Ban).
 */
export const radialActionFromPointer = (
  anchor: { x: number; y: number } | null,
  px: number,
  py: number,
  allowDeselect: boolean,
): RadialAction | null => {
  if (!anchor) return null;
  const dx = px - anchor.x;
  const dy = py - anchor.y;
  if (Math.hypot(dx, dy) < 26) return null; // dead zone → cancel
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const options = allowDeselect ? [...MODES, 'deselect' as RadialAction] : MODES;
  let best: RadialAction | null = null;
  let bestGap = Infinity;
  for (const opt of options) {
    const gap = angularGap(deg, ANGLE[opt]);
    if (gap < bestGap) {
      bestGap = gap;
      best = opt;
    }
  }
  return best;
};
