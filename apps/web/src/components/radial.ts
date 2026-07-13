import type { InputMode } from '../game/store';

export interface RadialState {
  /** Anchor point (viewport coords) — the centre of the held cell. */
  x: number;
  y: number;
  /** Mode currently under the finger (null = in the dead zone / cancel). */
  active: InputMode | null;
}

/**
 * Maps the pointer position (relative to the anchor) to a mode, or null when
 * it's still inside the central dead zone. The four sectors match the icon
 * positions drawn by RadialMenu: up = Digit, right = Notes, down = Notes 2,
 * left = Ban.
 */
export const radialModeFromPointer = (
  anchor: { x: number; y: number } | null,
  px: number,
  py: number,
): InputMode | null => {
  if (!anchor) return null;
  const dx = px - anchor.x;
  const dy = py - anchor.y;
  if (Math.hypot(dx, dy) < 26) return null; // dead zone → cancel
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = right, 90 = down, -90 = up
  if (deg >= -45 && deg < 45) return 'note'; // right
  if (deg >= 45 && deg < 135) return 'noteAlt'; // down
  if (deg >= -135 && deg < -45) return 'normal'; // up
  return 'ban'; // left
};
