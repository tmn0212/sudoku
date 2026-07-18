// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useGame, resolvedPeerDigits } from './store';
import { useSettings } from '../state/settingsStore';

const firstEmptyCell = () => {
  const { given } = useGame.getState();
  return given.findIndex((g) => !g);
};

// The puzzle is randomly generated per test, and a digit already resolved in a
// cell's row/column/box can no longer be placed, noted, or banned there. These
// helpers pick digits/cells the new rule actually permits, so the tests stay
// robust across seeds instead of assuming any digit goes anywhere.

/** Digits that can still legally go in `cell` (no peer already resolves them). */
const placeable = (cell: number): number[] => {
  const resolved = resolvedPeerDigits(useGame.getState(), cell);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !(resolved & (1 << d)));
};

/** An empty cell with at least `n` legally-placeable digits. */
const freeCell = (n = 1): number => {
  const { given } = useGame.getState();
  for (let i = 0; i < 81; i++) if (!given[i] && placeable(i).length >= n) return i;
  throw new Error(`no empty cell with ${n} placeable digits`);
};

/** A placeable digit for `cell` that is NOT its solution (a genuine mistake). */
const wrongPlaceable = (cell: number): number =>
  placeable(cell).find((d) => d !== useGame.getState().solution[cell])!;

describe('game store', () => {
  beforeEach(() => {
    localStorage.clear();
    useGame.getState().newGame('easy');
  });

  it('starts a game with a valid puzzle and given mask', () => {
    const s = useGame.getState();
    expect(s.values).toHaveLength(81);
    expect(s.given.filter(Boolean).length).toBe(s.puzzle.filter((v) => v !== 0).length);
    expect(s.status).toBe('playing');
    expect(s.selected).toBeNull();
  });

  it('places a digit in the selected empty cell', () => {
    const cell = freeCell();
    const d = placeable(cell)[0];
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(d);
    expect(useGame.getState().values[cell]).toBe(d);
  });

  it('does not modify given cells', () => {
    const givenCell = useGame.getState().given.findIndex(Boolean);
    const original = useGame.getState().values[givenCell];
    useGame.getState().selectCell(givenCell);
    useGame.getState().inputDigit(original === 9 ? 1 : 9);
    expect(useGame.getState().values[givenCell]).toBe(original);
  });

  it('counts a mistake when auto-check is on and the entry is wrong', () => {
    const cell = freeCell(2);
    const wrong = wrongPlaceable(cell);
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(wrong);
    expect(useGame.getState().mistakes).toBe(1);
  });

  it('toggles blue pencil notes in note mode', () => {
    const cell = freeCell(2);
    const [a, b] = placeable(cell);
    useGame.getState().selectCell(cell);
    useGame.getState().setInputMode('note');
    useGame.getState().inputDigit(a);
    useGame.getState().inputDigit(b);
    const notes = useGame.getState().notes[cell];
    expect(notes & (1 << a)).toBeTruthy();
    expect(notes & (1 << b)).toBeTruthy();
    // Toggling again removes it.
    useGame.getState().inputDigit(a);
    expect(useGame.getState().notes[cell] & (1 << a)).toBeFalsy();
  });

  it('keeps grey notes and red bans in separate layers', () => {
    const cell = freeCell(2);
    const [a, b] = placeable(cell);
    useGame.getState().selectCell(cell);
    useGame.getState().setInputMode('noteAlt');
    useGame.getState().inputDigit(a);
    useGame.getState().setInputMode('ban');
    useGame.getState().inputDigit(b);
    const s = useGame.getState();
    expect(s.notesAlt[cell] & (1 << a)).toBeTruthy();
    expect(s.bans[cell] & (1 << b)).toBeTruthy();
    expect(s.notes[cell]).toBe(0); // blue layer untouched
  });

  it('moves a mark between layers when the same digit is re-marked in another mode', () => {
    const cell = freeCell();
    const d = placeable(cell)[0];
    useGame.getState().selectCell(cell);
    // Pencil a blue note...
    useGame.getState().setInputMode('note');
    useGame.getState().inputDigit(d);
    expect(useGame.getState().notes[cell] & (1 << d)).toBeTruthy();
    // ...then re-mark the same digit as a grey note: it should MOVE, not stack.
    useGame.getState().setInputMode('noteAlt');
    useGame.getState().inputDigit(d);
    let s = useGame.getState();
    expect(s.notesAlt[cell] & (1 << d)).toBeTruthy();
    expect(s.notes[cell] & (1 << d)).toBeFalsy(); // left the blue layer
    // ...and again as a ban.
    useGame.getState().setInputMode('ban');
    useGame.getState().inputDigit(d);
    s = useGame.getState();
    expect(s.bans[cell] & (1 << d)).toBeTruthy();
    expect(s.notesAlt[cell] & (1 << d)).toBeFalsy(); // left the grey layer
    // Re-marking in the same (ban) mode toggles it off entirely.
    useGame.getState().inputDigit(d);
    s = useGame.getState();
    expect(s.bans[cell] & (1 << d)).toBeFalsy();
    expect(s.notes[cell] & (1 << d)).toBeFalsy();
    expect(s.notesAlt[cell] & (1 << d)).toBeFalsy();
  });

  it('applies notes to every cell of a multi-selection', () => {
    // Pick a digit and three empty cells that all still allow it, so the
    // resolved-peer rule doesn't skip any of them.
    const given = useGame.getState().given;
    let digit = 0;
    let empties: number[] = [];
    for (let d = 1; d <= 9 && empties.length < 3; d++) {
      const cells = given
        .map((g, i) => (g ? -1 : i))
        .filter((i) => i >= 0 && placeable(i).includes(d));
      if (cells.length >= 3) {
        digit = d;
        empties = cells.slice(0, 3);
      }
    }
    useGame.getState().setSelection(empties);
    useGame.getState().setInputMode('note');
    useGame.getState().inputDigit(digit);
    const notes = useGame.getState().notes;
    for (const i of empties) expect(notes[i] & (1 << digit)).toBeTruthy();
  });

  it('placing a digit clears that cell\'s notes and bans', () => {
    const cell = freeCell(2);
    useGame.getState().selectCell(cell);
    useGame.getState().setInputMode('note');
    useGame.getState().inputDigit(placeable(cell)[0]);
    useGame.getState().setInputMode('normal');
    useGame.getState().inputDigit(useGame.getState().solution[cell]);
    expect(useGame.getState().notes[cell]).toBe(0);
  });

  it('supports undo and redo', () => {
    const cell = freeCell();
    const d = placeable(cell)[0];
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(d);
    expect(useGame.getState().values[cell]).toBe(d);
    useGame.getState().undo();
    expect(useGame.getState().values[cell]).toBe(0);
    useGame.getState().redo();
    expect(useGame.getState().values[cell]).toBe(d);
  });

  it('erases a filled (incorrect, still-editable) cell', () => {
    const cell = freeCell(2);
    const wrong = wrongPlaceable(cell);
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(wrong);
    useGame.getState().erase();
    expect(useGame.getState().values[cell]).toBe(0);
  });

  it('locks a correctly filled cell against overwrite and erase', () => {
    const cell = firstEmptyCell();
    const correct = useGame.getState().solution[cell];
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(correct); // auto-check on by default -> locks
    const other = correct === 9 ? 1 : correct + 1;
    useGame.getState().inputDigit(other);
    expect(useGame.getState().values[cell]).toBe(correct); // can't overwrite
    useGame.getState().erase();
    expect(useGame.getState().values[cell]).toBe(correct); // can't erase
  });

  it('does not lock correct cells when auto-check is off', () => {
    useGame.getState().setAutoCheck(false);
    const cell = firstEmptyCell();
    const correct = useGame.getState().solution[cell];
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(correct);
    useGame.getState().erase(); // no validation -> still editable
    expect(useGame.getState().values[cell]).toBe(0);
    useGame.getState().setAutoCheck(true);
  });

  it('autoBanWrong pops a wrong entry out into the permanent lock layer', () => {
    const cell = freeCell(2);
    const wrong = wrongPlaceable(cell);
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(wrong);
    expect(useGame.getState().values[cell]).toBe(wrong);
    useGame.getState().autoBanWrong(cell, wrong);
    const s = useGame.getState();
    expect(s.values[cell]).toBe(0); // popped out
    expect(s.lockedBans[cell] & (1 << wrong)).toBeTruthy(); // permanently locked
    expect(s.bans[cell] & (1 << wrong)).toBeFalsy(); // not a user ban
  });

  it('a locked ban survives undo and blocks re-entry of that digit', () => {
    const cell = freeCell(2);
    const wrong = wrongPlaceable(cell);
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(wrong);
    useGame.getState().autoBanWrong(cell, wrong);
    useGame.getState().undo(); // undo the original placement
    expect(useGame.getState().lockedBans[cell] & (1 << wrong)).toBeTruthy(); // still locked
    // ...and the digit can't be entered there again.
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(wrong);
    expect(useGame.getState().values[cell]).toBe(0);
  });

  it('restart clears locked bans', () => {
    const cell = freeCell(2);
    const wrong = wrongPlaceable(cell);
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(wrong);
    useGame.getState().autoBanWrong(cell, wrong);
    useGame.getState().restartGame();
    expect(useGame.getState().lockedBans.some(Boolean)).toBe(false);
  });

  it('switching to Digit collapses a multi-selection to its first cell', () => {
    const empties = useGame
      .getState()
      .given.map((g, i) => (g ? -1 : i))
      .filter((i) => i >= 0)
      .slice(0, 3);
    useGame.getState().setSelection(empties);
    useGame.getState().setInputMode('note');
    expect(useGame.getState().selection).toHaveLength(3);
    useGame.getState().setInputMode('normal');
    expect(useGame.getState().selection).toEqual([empties[0]]);
    expect(useGame.getState().selected).toBe(empties[0]);
  });

  describe('committed vs transient input mode', () => {
    const threeEmpties = () =>
      useGame.getState().given.map((g, i) => (g ? -1 : i)).filter((i) => i >= 0).slice(0, 3);

    beforeEach(() => {
      useSettings.setState({ autoRevertMode: true });
    });

    it('a mode-bar tap commits the tool, which survives a digit entry', () => {
      const cell = freeCell();
      useGame.getState().selectCell(cell);
      useGame.getState().setInputMode('note');
      expect(useGame.getState().committedMode).toBe('note');
      useGame.getState().inputDigit(placeable(cell)[0]);
      expect(useGame.getState().inputMode).toBe('note');
      expect(useGame.getState().committedMode).toBe('note');
    });

    it('a transient tool snaps back to the committed tool after a digit entry', () => {
      const cell = freeCell();
      useGame.getState().selectCell(cell);
      useGame.getState().setInputModeTransient('ban'); // gesture, committed stays normal
      expect(useGame.getState().inputMode).toBe('ban');
      expect(useGame.getState().committedMode).toBe('normal');
      useGame.getState().inputDigit(placeable(cell)[0]);
      expect(useGame.getState().inputMode).toBe('normal'); // snapped back
    });

    it('with auto-revert off, a transient tool commits and sticks past an entry', () => {
      useSettings.setState({ autoRevertMode: false });
      const cell = freeCell();
      useGame.getState().selectCell(cell);
      useGame.getState().setInputModeTransient('note');
      expect(useGame.getState().committedMode).toBe('note'); // commits when off
      useGame.getState().inputDigit(placeable(cell)[0]);
      expect(useGame.getState().inputMode).toBe('note'); // no snap-back
    });

    it('cycling through Digit keeps the multi-selection and restores it on exit', () => {
      const empties = threeEmpties();
      useGame.getState().setSelection(empties);
      useGame.getState().setInputMode('note');
      useGame.getState().cycleInputMode(); // note -> noteAlt
      expect(useGame.getState().selection).toHaveLength(3);
      useGame.getState().cycleInputMode(); // noteAlt -> ban
      expect(useGame.getState().selection).toHaveLength(3);
      useGame.getState().cycleInputMode(); // ban -> normal, collapse to first cell
      expect(useGame.getState().inputMode).toBe('normal');
      expect(useGame.getState().selection).toEqual([empties[0]]);
      useGame.getState().cycleInputMode(); // normal -> note, restore the group
      expect(useGame.getState().inputMode).toBe('note');
      expect(useGame.getState().selection).toEqual(empties);
    });

    it('restores the group after a plain-tap collapse then a double-tap cycle', () => {
      const empties = threeEmpties();
      useGame.getState().setSelection(empties);
      useGame.getState().setInputMode('note');
      // A plain tap inside the group collapses to one cell but stashes the group.
      useGame.getState().setSelection([empties[1]]);
      expect(useGame.getState().selection).toEqual([empties[1]]);
      // The double-tap cycle then restores the group as it cycles the mode.
      useGame.getState().cycleInputMode();
      expect(useGame.getState().selection).toEqual(empties);
      expect(useGame.getState().inputMode).toBe('noteAlt');
    });

    it('drops the stashed group once a fresh cell is selected', () => {
      const empties = threeEmpties();
      useGame.getState().setSelection(empties);
      useGame.getState().setSelection([empties[0]]); // collapse-member stashes group
      const other = useGame.getState().given.findIndex((g, i) => !g && !empties.includes(i));
      useGame.getState().selectCell(other);
      useGame.getState().cycleInputMode(); // normal -> note, nothing to restore
      expect(useGame.getState().selection).toEqual([other]);
    });
  });

  describe('note/ban on a peer-resolved digit', () => {
    // An empty cell + a digit that one of its peers already resolves (a given),
    // so the note-here rule rejects it.
    const resolvedCellDigit = () => {
      const s = useGame.getState();
      for (let i = 0; i < 81; i++) {
        if (s.given[i] || s.values[i] !== 0) continue;
        const mask = resolvedPeerDigits(s, i);
        for (let d = 1; d <= 9; d++) if (mask & (1 << d)) return { cell: i, digit: d };
      }
      throw new Error('no empty cell with a resolved peer digit');
    };

    it('bounces a note instead of storing it when a peer resolves the digit', () => {
      const { cell, digit } = resolvedCellDigit();
      useGame.getState().selectCell(cell);
      useGame.getState().setInputMode('note');
      useGame.getState().inputDigit(digit);
      const s = useGame.getState();
      expect(s.notes[cell] & (1 << digit)).toBeFalsy(); // not noted
      expect(s.bounce).not.toBeNull();
      expect(s.bounce?.cells).toContain(cell);
      expect(s.bounce?.digit).toBe(digit);
      expect(s.bounce?.layer).toBe('note');
    });

    it('lets you ban a peer-resolved digit (no bounce)', () => {
      const { cell, digit } = resolvedCellDigit();
      useGame.getState().selectCell(cell);
      useGame.getState().setInputMode('ban');
      useGame.getState().inputDigit(digit);
      const s = useGame.getState();
      expect(s.bans[cell] & (1 << digit)).toBeTruthy(); // ban recorded
      expect(s.bounce).toBeNull(); // a ban never bounces
    });

    it('notes the legal cells and bounces only the illegal ones in a multi-selection', () => {
      const s0 = useGame.getState();
      const { cell: illegal, digit } = resolvedCellDigit();
      let legal = -1;
      for (let i = 0; i < 81; i++) {
        if (s0.given[i] || s0.values[i] !== 0 || i === illegal) continue;
        if (!(resolvedPeerDigits(s0, i) & (1 << digit))) { legal = i; break; }
      }
      expect(legal).toBeGreaterThanOrEqual(0);
      useGame.getState().setSelection([legal, illegal]);
      useGame.getState().setInputMode('note');
      useGame.getState().inputDigit(digit);
      const s = useGame.getState();
      expect(s.notes[legal] & (1 << digit)).toBeTruthy(); // legal cell keeps the note
      expect(s.notes[illegal] & (1 << digit)).toBeFalsy(); // illegal cell bounces
      expect(s.bounce?.cells).toEqual([illegal]);
    });
  });

  it('produces a correct, applicable hint', () => {
    useGame.getState().requestHint();
    const hint = useGame.getState().hint;
    expect(hint).not.toBeNull();
    if (hint?.step && hint.step.placements.length > 0) {
      const { cell, value } = hint.step.placements[0];
      expect(value).toBe(useGame.getState().solution[cell]);
      useGame.getState().applyHint();
      expect(useGame.getState().values[cell]).toBe(value);
    }
  });

  it('detects a win when the grid is completed correctly', () => {
    const { solution, given } = useGame.getState();
    for (let i = 0; i < 81; i++) {
      if (given[i]) continue;
      useGame.getState().selectCell(i);
      useGame.getState().inputDigit(solution[i]);
    }
    expect(useGame.getState().status).toBe('won');
    expect(useGame.getState().mistakes).toBe(0);
    expect(useGame.getState().score).toBeGreaterThan(0);
  });

  it('startChallenge tags the game with its challenge ref', () => {
    const { puzzle, solution, given } = useGame.getState();
    useGame.getState().startChallenge(
      { puzzle, solution, difficulty: 'hard', givens: given.filter(Boolean).length },
      { difficulty: 'hard', index: 7 },
    );
    const s = useGame.getState();
    expect(s.challenge).toEqual({ difficulty: 'hard', index: 7 });
    expect(s.difficulty).toBe('hard');
    expect(s.status).toBe('playing');
    // Starting a plain game clears the challenge tag.
    useGame.getState().newGame('easy');
    expect(useGame.getState().challenge).toBeNull();
  });

  it('arcade mode ends after too many mistakes', () => {
    useGame.getState().newGame('easy', 'arcade');
    const { given } = useGame.getState();
    // Three empty cells that each have a legal-but-wrong digit available (a wrong
    // digit a peer already resolves would be refused, not counted as a mistake).
    const empties = given
      .map((g, i) => (g ? -1 : i))
      .filter((i) => i >= 0 && placeable(i).length >= 2)
      .slice(0, 3);
    for (const i of empties) {
      useGame.getState().selectCell(i);
      useGame.getState().inputDigit(wrongPlaceable(i));
    }
    expect(useGame.getState().status).toBe('lost');
    expect(useGame.getState().score).toBe(0);
    // No further input once the game is over.
    const before = useGame.getState().values.slice();
    useGame.getState().selectCell(empties[0]);
    useGame.getState().inputDigit(5);
    expect(useGame.getState().values).toEqual(before);
  });

  const solveFully = () => {
    const { solution, given } = useGame.getState();
    for (let i = 0; i < 81; i++) {
      if (given[i]) continue;
      useGame.getState().selectCell(i);
      useGame.getState().inputDigit(solution[i]);
    }
  };

  it('sets a positive final score on a win via inputDigit', () => {
    solveFully();
    expect(useGame.getState().status).toBe('won');
    expect(useGame.getState().score).toBeGreaterThan(0);
  });

  // Phase 2: undo clears the finished score and redo recomputes it, both via the
  // shared finalizeIfDone() reducer, so status and score never drift apart.
  it('undo clears the finished score and redo restores it', () => {
    solveFully();
    expect(useGame.getState().status).toBe('won');
    expect(useGame.getState().score).toBeGreaterThan(0);

    useGame.getState().undo();
    expect(useGame.getState().status).toBe('playing');
    expect(useGame.getState().score).toBe(0);

    useGame.getState().redo();
    expect(useGame.getState().status).toBe('won');
    expect(useGame.getState().score).toBeGreaterThan(0);
  });

  it('does not persist undo/redo history to localStorage', () => {
    const cell = firstEmptyCell();
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(useGame.getState().solution[cell]);
    // In memory there is now undo history...
    expect(useGame.getState().past.length).toBeGreaterThan(0);
    // ...but the persisted snapshot omits it (the board itself is still saved).
    const persisted = JSON.parse(localStorage.getItem('sudoku-game')!).state;
    expect(persisted.past).toBeUndefined();
    expect(persisted.future).toBeUndefined();
    expect(persisted.values[cell]).toBe(useGame.getState().solution[cell]);
  });

  // --- Resolved-peer rule: a digit fixed correctly in a cell can't recur in its
  //     row/column/box, and any stale marks for it there get swept. ---

  const zeros = () => new Array(81).fill(0);

  it('refuses to place or note a digit a given peer resolves, but allows banning it', () => {
    // Cell 1 is a given 7; cell 0 shares its row and box, so 7 is dead there.
    const values = zeros();
    const given = new Array(81).fill(false);
    values[1] = 7;
    given[1] = true;
    useGame.setState({
      values,
      given,
      notes: zeros(),
      notesAlt: zeros(),
      bans: zeros(),
      lockedBans: zeros(),
      selection: [0],
      selected: 0,
      inputMode: 'normal',
      status: 'playing',
    });

    useGame.getState().inputDigit(7);
    expect(useGame.getState().values[0]).toBe(0); // placement refused

    useGame.getState().setInputMode('note');
    useGame.getState().inputDigit(7);
    expect(useGame.getState().notes[0] & (1 << 7)).toBeFalsy(); // note not stored...
    expect(useGame.getState().bounce?.cells).toContain(0); // ...it bounced back out

    useGame.getState().setInputMode('ban');
    useGame.getState().inputDigit(7);
    expect(useGame.getState().bans[0] & (1 << 7)).toBeTruthy(); // ban IS allowed now
  });

  it('sweeps a correctly placed digit from peers\' notes, alt-notes, and bans', () => {
    useSettings.setState({ autoCleanupNotes: true });
    const solution = useGame.getState().solution.slice();
    solution[0] = 5; // cell 0's answer is 5
    const notes = zeros();
    const notesAlt = zeros();
    const bans = zeros();
    notes[1] = 1 << 5; // peers 1,2,3 all sit in row 0 and each mark 5...
    notesAlt[2] = 1 << 5;
    bans[3] = 1 << 5;
    useGame.setState({
      solution,
      values: zeros(),
      given: new Array(81).fill(false),
      notes,
      notesAlt,
      bans,
      lockedBans: zeros(),
      selection: [0],
      selected: 0,
      inputMode: 'normal',
      status: 'playing',
      autoCheck: true,
      mistakes: 0,
    });

    useGame.getState().inputDigit(5); // correct placement
    const s = useGame.getState();
    expect(s.values[0]).toBe(5);
    expect(s.notes[1] & (1 << 5)).toBeFalsy(); // ...and 5 is swept from all three
    expect(s.notesAlt[2] & (1 << 5)).toBeFalsy();
    expect(s.bans[3] & (1 << 5)).toBeFalsy();
  });

  it('does not sweep peers when the auto-clean-notes setting is off', () => {
    useSettings.setState({ autoCleanupNotes: false });
    const solution = useGame.getState().solution.slice();
    solution[0] = 5;
    const notes = zeros();
    notes[1] = 1 << 5;
    useGame.setState({
      solution,
      values: zeros(),
      given: new Array(81).fill(false),
      notes,
      notesAlt: zeros(),
      bans: zeros(),
      lockedBans: zeros(),
      selection: [0],
      selected: 0,
      inputMode: 'normal',
      status: 'playing',
      autoCheck: true,
    });
    useGame.getState().inputDigit(5);
    expect(useGame.getState().notes[1] & (1 << 5)).toBeTruthy(); // left alone
    useSettings.setState({ autoCleanupNotes: true }); // restore for other tests
  });

  it('a correct player entry resolves peers only while validating', () => {
    const setup = () => {
      const solution = useGame.getState().solution.slice();
      solution[0] = 4;
      const values = zeros();
      values[0] = 4; // a correct *player* entry (not a given) in row 0
      useGame.setState({
        solution,
        values,
        given: new Array(81).fill(false),
        notes: zeros(),
        notesAlt: zeros(),
        bans: zeros(),
        lockedBans: zeros(),
        selection: [1],
        selected: 1,
        inputMode: 'normal',
        status: 'playing',
        mistakes: 0,
      });
    };

    // Auto-check OFF: the game can't know cell 0 is right, so 4 is still allowed
    // in its row-peer — no correctness leak.
    setup();
    useGame.setState({ autoCheck: false });
    useGame.getState().inputDigit(4);
    expect(useGame.getState().values[1]).toBe(4);

    // Auto-check ON: cell 0's correct 4 now resolves the row, refusing 4 there.
    setup();
    useGame.setState({ autoCheck: true });
    useGame.getState().inputDigit(4);
    expect(useGame.getState().values[1]).toBe(0);
  });
});
