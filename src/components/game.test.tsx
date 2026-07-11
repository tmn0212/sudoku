// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Board } from './Board';
import { NumberPad } from './NumberPad';
import { Controls } from './Controls';
import { useGame } from '../game/store';

const renderGame = () =>
  render(
    <>
      <Board />
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

  it('selects a cell on tap and enters a digit from the number pad', async () => {
    const user = userEvent.setup();
    renderGame();
    const cell = firstEmptyCell();

    await user.click(screen.getByTestId(`cell-${cell}`));
    expect(useGame.getState().selected).toBe(cell);

    await user.click(screen.getByRole('button', { name: /Enter 6/ }));
    expect(useGame.getState().values[cell]).toBe(6);
    expect(screen.getByTestId(`cell-${cell}`)).toHaveTextContent('6');
  });

  it('writes pencil marks when Notes mode is on', async () => {
    const user = userEvent.setup();
    renderGame();
    const cell = firstEmptyCell();

    await user.click(screen.getByRole('button', { name: /Notes/ }));
    await user.click(screen.getByTestId(`cell-${cell}`));
    await user.click(screen.getByRole('button', { name: /Enter 2/ }));

    expect(useGame.getState().notes[cell] & (1 << 2)).toBeTruthy();
    // The cell shows the pencil mark, not a big value.
    expect(useGame.getState().values[cell]).toBe(0);
  });

  it('disables a number pad key once all nine are placed', () => {
    // Fill every 7 from the solution, then the "7" key should be disabled.
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
