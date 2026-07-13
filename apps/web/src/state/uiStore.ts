// Web wiring: the in-app router has no platform dependencies, so re-export the
// ready singleton from @sudoku/state. (Kept at this path so consumers are unchanged.)
export { useUi } from '@sudoku/state';
export type { Screen, ScreenParams } from '@sudoku/state';
