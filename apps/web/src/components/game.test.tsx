// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Board } from './Board';
import { NumberPad } from './NumberPad';
import { Controls } from './Controls';
import { InputModeBar } from './InputModeBar';
import { useGame } from '../game/store';
import { useSettings } from '../state/settingsStore';

const renderGame = () =>
  render(
    <>
      <Board />
      <InputModeBar />
      <NumberPad />
      <Controls />
    </>,
  );

const firstEmptyCell = () => useGame.getState().given.findIndex((g) => !g);

describe('<Board> interaction', () => {
  beforeEach(() => {
    localStorage.clear();
    useGame.getState().newGame('easy');
  });
  afterEach(cleanup);

  it('renders all 81 cells', () => {
    renderGame();
    expect(screen.getByLabelText('Sudoku board').querySelectorAll('.cell')).toHaveLength(81);
  });

  it('enters a digit from the number pad into the selected cell', async () => {
    const user = userEvent.setup();
    renderGame();
    const cell = firstEmptyCell();
    useGame.getState().selectCell(cell);

    await user.click(screen.getByRole('button', { name: /Enter 6/ }));
    expect(useGame.getState().values[cell]).toBe(6);
    expect(screen.getByTestId(`cell-${cell}`)).toHaveTextContent('6');
  });

  it('writes blue pencil marks when Notes mode is on', async () => {
    const user = userEvent.setup();
    renderGame();
    const cell = firstEmptyCell();
    useGame.getState().selectCell(cell);

    // Switch to the blue "Notes" mode via the mode bar (second button).
    await user.click(screen.getAllByRole('button', { name: /Notes/ })[0]);
    await user.click(screen.getByRole('button', { name: /Enter 2/ }));

    expect(useGame.getState().notes[cell] & (1 << 2)).toBeTruthy();
    expect(useGame.getState().values[cell]).toBe(0);
  });

  it('flags every banned cell red during a scan, even outside the shaded lines', () => {
    // A single 5 sits at index 0; ban 5 at index 40 (a different row, column, and
    // box, so it is NOT inside the shaded crossroad). Selecting the 5 starts a
    // scan, and the ban must still turn red — every elimination for the digit.
    const values = new Array(81).fill(0);
    const given = new Array(81).fill(false);
    const bans = new Array(81).fill(0);
    values[0] = 5;
    given[0] = true;
    bans[40] = 1 << 5;
    useGame.setState({ values, given, bans, selection: [0], selected: 0 });

    renderGame();

    expect(screen.getByTestId('cell-40').className).toContain('cell--cross-banned');
  });

  it('does not flag banned cells red when crosshatch scanning is off', () => {
    const values = new Array(81).fill(0);
    const given = new Array(81).fill(false);
    const bans = new Array(81).fill(0);
    values[0] = 5;
    given[0] = true;
    bans[40] = 1 << 5;
    useGame.setState({ values, given, bans, selection: [0], selected: 0 });
    useSettings.setState({ highlightCrosshatch: false });

    renderGame();

    expect(screen.getByTestId('cell-40').className).not.toContain('cell--cross-banned');
    useSettings.setState({ highlightCrosshatch: true }); // restore for other tests
  });

  it('gives every filled cell the yellow same-number wash during a scan, even with same-number off', () => {
    // Scanned digit 5 at index 0; a different digit (7) sits at index 40. With
    // "Highlight same number" off, the 7 must still take the same-number wash
    // because it is filled — occupied cells are never scan candidates.
    const values = new Array(81).fill(0);
    const given = new Array(81).fill(false);
    values[0] = 5;
    given[0] = true;
    values[40] = 7;
    useGame.setState({ values, given, bans: new Array(81).fill(0), selection: [0], selected: 0 });
    useSettings.setState({ highlightSame: false });

    renderGame();
    expect(screen.getByTestId('cell-40').className).toContain('cell--cross-filled');

    useSettings.setState({ highlightSame: true }); // restore for other tests
  });

  it('keeps the selected cell crosshair amber even where a filled cell sits on it', () => {
    // Select a 5 at index 0; a different digit (3) at index 3 lies on that cell's
    // row (its crosshair). It must stay the amber crosshair (cross-self), not take
    // the yellow filled wash — the crosshair reads as one unbroken cross.
    const values = new Array(81).fill(0);
    const given = new Array(81).fill(false);
    values[0] = 5;
    given[0] = true;
    values[3] = 3; // row 0 = the selected cell's crosshair
    given[3] = true;
    useGame.setState({ values, given, bans: new Array(81).fill(0), selection: [0], selected: 0 });

    renderGame();
    const cls = screen.getByTestId('cell-3').className;
    expect(cls).toContain('cell--cross-self');
    expect(cls).not.toContain('cell--cross-filled');
  });

  it('disables a number pad key once all nine are placed', () => {
    const { solution, given } = useGame.getState();
    for (let i = 0; i < 81; i++) {
      if (given[i] || solution[i] !== 7) continue;
      useGame.getState().selectCell(i);
      useGame.getState().inputDigit(7);
    }
    renderGame();
    expect(screen.getByRole('button', { name: /Enter 7/ })).toBeDisabled();
  });
});
