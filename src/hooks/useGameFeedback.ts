import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { haptics } from '../utils/haptics';

/**
 * Fires haptic feedback in response to game events (new mistakes, win, loss),
 * keeping side effects out of the pure game store. Mounted once by the Game
 * screen.
 */
export const useGameFeedback = (): void => {
  const mistakes = useGame((s) => s.mistakes);
  const status = useGame((s) => s.status);
  const prevMistakes = useRef(mistakes);

  useEffect(() => {
    if (mistakes > prevMistakes.current) haptics.error();
    prevMistakes.current = mistakes;
  }, [mistakes]);

  useEffect(() => {
    if (status === 'won') haptics.success();
    else if (status === 'lost') haptics.error();
  }, [status]);
};
