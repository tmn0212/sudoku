import { useEffect } from 'react';
import { SIZE } from '../engine/board';
import { useGame } from '../game/store';

/** Desktop keyboard controls: digits, erase, arrow navigation, notes toggle. */
export const useKeyboard = (): void => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const state = useGame.getState();
      const { selected } = state;

      if (e.key >= '1' && e.key <= '9') {
        state.inputDigit(Number(e.key));
        e.preventDefault();
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        state.erase();
        e.preventDefault();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        state.cycleInputMode();
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        state.requestHint();
        return;
      }

      // Arrow-key navigation.
      const move: Record<string, number> = {
        ArrowUp: -SIZE,
        ArrowDown: SIZE,
        ArrowLeft: -1,
        ArrowRight: 1,
      };
      if (e.key in move) {
        const base = selected ?? 0;
        let next = base + move[e.key];
        if (next < 0 || next >= SIZE * SIZE) next = base;
        // Prevent horizontal wrap across rows.
        if ((e.key === 'ArrowLeft' && base % SIZE === 0) ||
            (e.key === 'ArrowRight' && base % SIZE === SIZE - 1)) {
          next = base;
        }
        state.selectCell(next);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
};
