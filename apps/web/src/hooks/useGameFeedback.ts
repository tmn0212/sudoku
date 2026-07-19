import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { haptics } from '../platform/haptics';
import { sound } from '../platform/sound';
import { useSettings } from '../state/settingsStore';

/**
 * Fires haptic + sound feedback in response to game events (new mistakes, win,
 * loss), keeping side effects out of the pure game store. Sound is gated on the
 * `sound` setting; haptics always fire (they're a silent no-op where unsupported).
 * Mounted once by the Game screen.
 */
export const useGameFeedback = (): void => {
  const mistakes = useGame((s) => s.mistakes);
  const status = useGame((s) => s.status);
  const prevMistakes = useRef(mistakes);

  useEffect(() => {
    if (mistakes > prevMistakes.current) {
      haptics.error();
      if (useSettings.getState().sound) sound.error();
    }
    prevMistakes.current = mistakes;
  }, [mistakes]);

  useEffect(() => {
    const on = useSettings.getState().sound;
    if (status === 'won') {
      haptics.success();
      if (on) sound.win();
    } else if (status === 'lost') {
      haptics.error();
      if (on) sound.lose();
    }
  }, [status]);
};
