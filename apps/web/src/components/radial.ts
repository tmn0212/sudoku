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

/** One option's slot on the ring: which action, and the icon direction as an
 *  atan2 angle in degrees (0 = right, 90 = down, -90 = up). */
export interface RadialSlot {
  action: RadialAction;
  angle: number;
}

/** Four modes at the cardinal points — the familiar single-cell hold. */
const CARDINAL: RadialSlot[] = [
  { action: 'normal', angle: -90 }, // up
  { action: 'note', angle: 0 }, // right
  { action: 'noteAlt', angle: 90 }, // down
  { action: 'ban', angle: 180 }, // left
];

/** With Deselect, the five options spread evenly (a point-up pentagon, 72°
 *  apart) so nothing crowds: Digit stays at the top, the two note tools sit on
 *  the right, and Ban / Deselect (the "remove" pair) sit on the left. */
const PENTAGON: RadialSlot[] = [
  { action: 'normal', angle: -90 }, // up
  { action: 'note', angle: -18 }, // upper right
  { action: 'noteAlt', angle: 54 }, // lower right
  { action: 'deselect', angle: 126 }, // lower left
  { action: 'ban', angle: -162 }, // upper left
];

/** The slots to draw / hit-test, given whether Deselect is offered. Single
 *  source of truth so the drawn icons and the pointer sectors always agree. */
export const radialLayout = (deselect: boolean): RadialSlot[] =>
  deselect ? PENTAGON : CARDINAL;

/** Smallest absolute angle (deg) between two directions, wrap-aware. */
const angularGap = (a: number, b: number): number =>
  Math.abs(((((a - b) % 360) + 540) % 360) - 180);

/**
 * Maps the pointer position (relative to the anchor) to the nearest option, or
 * null when it's still inside the central dead zone. Selection is a Voronoi
 * split by icon direction over whichever layout is active (see `radialLayout`).
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
  let best: RadialAction | null = null;
  let bestGap = Infinity;
  for (const slot of radialLayout(allowDeselect)) {
    const gap = angularGap(deg, slot.angle);
    if (gap < bestGap) {
      bestGap = gap;
      best = slot.action;
    }
  }
  return best;
};
