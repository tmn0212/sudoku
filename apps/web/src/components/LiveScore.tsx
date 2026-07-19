import { useEffect, useMemo, useRef, useState } from 'react';
import { liveScore } from '@sudoku/core';
import { useGame } from '../game/store';
import { AnimatedNumber } from './AnimatedNumber';

/**
 * The running Arcade score in the top bar. It can't include the time bonus (only
 * known once the clock stops), so it shows the base rating scaled by how much of
 * the board is correctly filled, minus the mistake penalty — a number that
 * climbs as you solve and dips when you slip. The value tweens; a brief tint
 * marks whether the last change was a gain or a loss. The win screen picks up
 * from here and animates the time bonus on top (see WinOverlay).
 */
export const LiveScore = () => {
  const values = useGame((s) => s.values);
  const solution = useGame((s) => s.solution);
  const given = useGame((s) => s.given);
  const difficulty = useGame((s) => s.difficulty);
  const mistakes = useGame((s) => s.mistakes);

  const { filled, fillable } = useMemo(() => {
    let filled = 0;
    let fillable = 0;
    for (let i = 0; i < values.length; i++) {
      if (given[i]) continue;
      fillable++;
      if (values[i] !== 0 && values[i] === solution[i]) filled++;
    }
    return { filled, fillable };
  }, [values, solution, given]);

  const target = liveScore({ difficulty, filled, fillable, mistakes });

  // Tint the number green on a gain, red on a loss, then settle back.
  const prev = useRef(target);
  const [delta, setDelta] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (target === prev.current) return;
    const dir: 'up' | 'down' = target > prev.current ? 'up' : 'down';
    prev.current = target;
    setDelta(dir);
    const t = setTimeout(() => setDelta(null), 600);
    return () => clearTimeout(t);
  }, [target]);

  return (
    <span
      className="topbar__score"
      data-delta={delta ?? undefined}
      aria-label={`${target} points`}
    >
      <AnimatedNumber value={target} duration={450} className="topbar__score-value" />
      <span className="topbar__score-unit">pts</span>
    </span>
  );
};
