// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useGame, resolvedPeerDigits } from './store';
import { useSettings } from '../state/settingsStore';
import { useBanPrompt } from '../state/banPromptStore';
import { requestDigit } from './inputActions';

// Guards the ban-confirm gate (the "you banned this here — place anyway?" flow)
// and, critically, that a permanent lockedBan is a *different* thing from a user
// ban: a fix that conflated the two shipped as a regression the owner caught on
// device (git 6a3623e). See docs/architecture/05-testing.md.

const firstEmptyCell = () => useGame.getState().given.findIndex((g) => !g);

// The puzzle is random per test, and a digit a peer already resolves can't be
// placed/noted/banned in a cell. Pick digits/cells the rule permits so these
// tests stay robust across seeds.
const placeable = (cell: number): number[] => {
  const resolved = resolvedPeerDigits(useGame.getState(), cell);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !(resolved & (1 << d)));
};
const freeCell = (n = 1): number => {
  const { given } = useGame.getState();
  for (let i = 0; i < 81; i++) if (!given[i] && placeable(i).length >= n) return i;
  throw new Error(`no empty cell with ${n} placeable digits`);
};
const wrongPlaceable = (cell: number): number =>
  placeable(cell).find((d) => d !== useGame.getState().solution[cell])!;

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
    const cell = freeCell();
    const d = placeable(cell)[0];
    banDigit(cell, d);
    useGame.getState().selectCell(cell);

    requestDigit(d);
    // Not placed yet — the prompt is open on digit d.
    expect(useGame.getState().values[cell]).toBe(0);
    expect(useBanPrompt.getState().digit).toBe(d);

    useBanPrompt.getState().confirm();
    expect(useGame.getState().values[cell]).toBe(d);
    expect(useBanPrompt.getState().digit).toBeNull();
  });

  it('places immediately (no prompt) when warn-on-banned is off', () => {
    useSettings.setState({ warnOnBanned: false });
    const cell = freeCell();
    const d = placeable(cell)[0];
    banDigit(cell, d);
    useGame.getState().selectCell(cell);

    requestDigit(d);
    expect(useGame.getState().values[cell]).toBe(d);
    expect(useBanPrompt.getState().digit).toBeNull();
  });

  it('never prompts in Ban mode — a tap toggles the ban instead', () => {
    const cell = freeCell();
    const d = placeable(cell)[0];
    banDigit(cell, d); // bans[cell] now has d
    useGame.getState().selectCell(cell);
    useGame.getState().setInputMode('ban');

    requestDigit(d); // in ban mode: forwards to inputDigit, which toggles the ban off
    expect(useBanPrompt.getState().digit).toBeNull();
    expect(useGame.getState().bans[cell] & (1 << d)).toBeFalsy();
  });

  it('blocks a locked-ban digit outright with no prompt (lockedBans != user bans)', () => {
    const cell = freeCell(2);
    const wrong = wrongPlaceable(cell);
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
