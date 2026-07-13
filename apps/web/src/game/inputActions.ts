/**
 * Shared entry point for "the user wants to enter this digit", used by both the
 * number pad and the keyboard so the ban-confirmation gate lives in one place.
 */

import { hasCandidate } from '../engine/board';
import { useSettings } from '../state/settingsStore';
import { useBanPrompt } from '../state/banPromptStore';
import { useGame, targetCells } from './store';

/**
 * When the warn-on-banned setting is on and `digit` is banned in a cell the tap
 * would write to (and we're not in ban mode, where a tap just clears the ban),
 * pause for confirmation; otherwise place it straight away.
 */
export const requestDigit = (digit: number): void => {
  const s = useGame.getState();
  if (s.status !== 'playing') return;
  if (useSettings.getState().warnOnBanned && s.inputMode !== 'ban') {
    const banned = targetCells(s).some((i) => hasCandidate(s.bans[i], digit));
    if (banned) {
      useBanPrompt.getState().ask(digit);
      return;
    }
  }
  s.inputDigit(digit);
};
