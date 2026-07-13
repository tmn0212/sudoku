// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useGame } from './store';
import { useSettings } from '../state/settingsStore';
import { useBanPrompt } from '../state/banPromptStore';
import { requestDigit } from './inputActions';

// Guards the ban-confirm gate (the "you banned this here — place anyway?" flow)
// and, critically, that a permanent lockedBan is a *different* thing from a user
// ban: a fix that conflated the two shipped as a regression the owner caught on
// device (git 6a3623e). See docs/architecture/05-testing.md.

const firstEmptyCell = () => useGame.getState().given.findIndex((g) => !g);

/** Put a user ban on `digit` in `cell` via the Ban input mode, then leave Ban mode. */
const banDigit = (cell: number, digit: number) => {
  useGame.getState().selectCell(cell);
  useGame.getState().setInputMode('ban');
  useGame.getState().inputDigit(digit);
  useGame.getState().setInputMode('normal');
};

describe('requestDigit (ban-confirm gate)', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettings.setState({ warnOnBanned: true });
    useBanPrompt.setState({ digit: null });
    useGame.getState().newGame('easy');
  });

  it('pauses for confirmation on a user-banned digit, then confirm places it', () => {
    const cell = firstEmptyCell();
    banDigit(cell, 5);
    useGame.getState().selectCell(cell);

    requestDigit(5);
    // Not placed yet — the prompt is open on digit 5.
    expect(useGame.getState().values[cell]).toBe(0);
    expect(useBanPrompt.getState().digit).toBe(5);

    useBanPrompt.getState().confirm();
    expect(useGame.getState().values[cell]).toBe(5);
    expect(useBanPrompt.getState().digit).toBeNull();
  });

  it('places immediately (no prompt) when warn-on-banned is off', () => {
    useSettings.setState({ warnOnBanned: false });
    const cell = firstEmptyCell();
    banDigit(cell, 5);
    useGame.getState().selectCell(cell);

    requestDigit(5);
    expect(useGame.getState().values[cell]).toBe(5);
    expect(useBanPrompt.getState().digit).toBeNull();
  });

  it('never prompts in Ban mode — a tap toggles the ban instead', () => {
    const cell = firstEmptyCell();
    banDigit(cell, 5); // bans[cell] now has 5
    useGame.getState().selectCell(cell);
    useGame.getState().setInputMode('ban');

    requestDigit(5); // in ban mode: forwards to inputDigit, which toggles the ban off
    expect(useBanPrompt.getState().digit).toBeNull();
    expect(useGame.getState().bans[cell] & (1 << 5)).toBeFalsy();
  });

  it('blocks a locked-ban digit outright with no prompt (lockedBans != user bans)', () => {
    const cell = firstEmptyCell();
    const correct = useGame.getState().solution[cell];
    const wrong = correct === 1 ? 2 : 1;
    // A wrong entry that lingers becomes a permanent lock (not a user ban).
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(wrong);
    useGame.getState().autoBanWrong(cell, wrong);
    expect(useGame.getState().values[cell]).toBe(0);

    useGame.getState().selectCell(cell);
    requestDigit(wrong);
    // No prompt (it's a lock, not a user ban) and the digit is refused outright.
    expect(useBanPrompt.getState().digit).toBeNull();
    expect(useGame.getState().values[cell]).toBe(0);
  });
});
