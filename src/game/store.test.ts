// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useGame } from './store';

const firstEmptyCell = () => {
  const { given } = useGame.getState();
  return given.findIndex((g) => !g);
};

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
    const cell = firstEmptyCell();
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(5);
    expect(useGame.getState().values[cell]).toBe(5);
  });

  it('does not modify given cells', () => {
    const givenCell = useGame.getState().given.findIndex(Boolean);
    const original = useGame.getState().values[givenCell];
    useGame.getState().selectCell(givenCell);
    useGame.getState().inputDigit(original === 9 ? 1 : 9);
    expect(useGame.getState().values[givenCell]).toBe(original);
  });

  it('counts a mistake when auto-check is on and the entry is wrong', () => {
    const cell = firstEmptyCell();
    const correct = useGame.getState().solution[cell];
    const wrong = correct === 1 ? 2 : 1;
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(wrong);
    expect(useGame.getState().mistakes).toBe(1);
  });

  it('toggles blue pencil notes in note mode', () => {
    const cell = firstEmptyCell();
    useGame.getState().selectCell(cell);
    useGame.getState().setInputMode('note');
    useGame.getState().inputDigit(3);
    useGame.getState().inputDigit(7);
    const notes = useGame.getState().notes[cell];
    expect(notes & (1 << 3)).toBeTruthy();
    expect(notes & (1 << 7)).toBeTruthy();
    // Toggling again removes it.
    useGame.getState().inputDigit(3);
    expect(useGame.getState().notes[cell] & (1 << 3)).toBeFalsy();
  });

  it('keeps grey notes and red bans in separate layers', () => {
    const cell = firstEmptyCell();
    useGame.getState().selectCell(cell);
    useGame.getState().setInputMode('noteAlt');
    useGame.getState().inputDigit(4);
    useGame.getState().setInputMode('ban');
    useGame.getState().inputDigit(9);
    const s = useGame.getState();
    expect(s.notesAlt[cell] & (1 << 4)).toBeTruthy();
    expect(s.bans[cell] & (1 << 9)).toBeTruthy();
    expect(s.notes[cell]).toBe(0); // blue layer untouched
  });

  it('moves a mark between layers when the same digit is re-marked in another mode', () => {
    const cell = firstEmptyCell();
    useGame.getState().selectCell(cell);
    // Pencil a blue note...
    useGame.getState().setInputMode('note');
    useGame.getState().inputDigit(6);
    expect(useGame.getState().notes[cell] & (1 << 6)).toBeTruthy();
    // ...then re-mark the same digit as a grey note: it should MOVE, not stack.
    useGame.getState().setInputMode('noteAlt');
    useGame.getState().inputDigit(6);
    let s = useGame.getState();
    expect(s.notesAlt[cell] & (1 << 6)).toBeTruthy();
    expect(s.notes[cell] & (1 << 6)).toBeFalsy(); // left the blue layer
    // ...and again as a ban.
    useGame.getState().setInputMode('ban');
    useGame.getState().inputDigit(6);
    s = useGame.getState();
    expect(s.bans[cell] & (1 << 6)).toBeTruthy();
    expect(s.notesAlt[cell] & (1 << 6)).toBeFalsy(); // left the grey layer
    // Re-marking in the same (ban) mode toggles it off entirely.
    useGame.getState().inputDigit(6);
    s = useGame.getState();
    expect(s.bans[cell] & (1 << 6)).toBeFalsy();
    expect(s.notes[cell] & (1 << 6)).toBeFalsy();
    expect(s.notesAlt[cell] & (1 << 6)).toBeFalsy();
  });

  it('applies notes to every cell of a multi-selection', () => {
    const empties = useGame
      .getState()
      .given.map((g, i) => (g ? -1 : i))
      .filter((i) => i >= 0)
      .slice(0, 3);
    useGame.getState().setSelection(empties);
    useGame.getState().setInputMode('note');
    useGame.getState().inputDigit(5);
    const notes = useGame.getState().notes;
    for (const i of empties) expect(notes[i] & (1 << 5)).toBeTruthy();
  });

  it('placing a digit clears that cell\'s notes and bans', () => {
    const cell = firstEmptyCell();
    useGame.getState().selectCell(cell);
    useGame.getState().setInputMode('note');
    useGame.getState().inputDigit(2);
    useGame.getState().setInputMode('normal');
    useGame.getState().inputDigit(useGame.getState().solution[cell]);
    expect(useGame.getState().notes[cell]).toBe(0);
  });

  it('supports undo and redo', () => {
    const cell = firstEmptyCell();
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(4);
    expect(useGame.getState().values[cell]).toBe(4);
    useGame.getState().undo();
    expect(useGame.getState().values[cell]).toBe(0);
    useGame.getState().redo();
    expect(useGame.getState().values[cell]).toBe(4);
  });

  it('erases a filled cell', () => {
    const cell = firstEmptyCell();
    useGame.getState().selectCell(cell);
    useGame.getState().inputDigit(4);
    useGame.getState().erase();
    expect(useGame.getState().values[cell]).toBe(0);
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
    const { solution, given } = useGame.getState();
    const empties = given.map((g, i) => (g ? -1 : i)).filter((i) => i >= 0).slice(0, 3);
    for (const i of empties) {
      const wrong = solution[i] === 1 ? 2 : 1;
      useGame.getState().selectCell(i);
      useGame.getState().inputDigit(wrong);
    }
    expect(useGame.getState().status).toBe('lost');
    expect(useGame.getState().score).toBe(0);
    // No further input once the game is over.
    const before = useGame.getState().values.slice();
    useGame.getState().selectCell(empties[0]);
    useGame.getState().inputDigit(5);
    expect(useGame.getState().values).toEqual(before);
  });
});
