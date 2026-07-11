import { useMemo } from 'react';
import { useGame } from '../game/store';

export const NumberPad = () => {
  const values = useGame((s) => s.values);
  const inputDigit = useGame((s) => s.inputDigit);
  const status = useGame((s) => s.status);

  // How many of each digit remain to be placed (9 of each in a full grid).
  const remaining = useMemo(() => {
    const counts = new Array(10).fill(9);
    for (const v of values) if (v > 0) counts[v] -= 1;
    return counts;
  }, [values]);

  return (
    <div className="numberpad" role="group" aria-label="Number pad">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => {
        const done = remaining[n] <= 0;
        return (
          <button
            key={n}
            type="button"
            className="numberpad__key"
            disabled={done || status === 'won'}
            onClick={() => inputDigit(n)}
            aria-label={`Enter ${n}, ${Math.max(remaining[n], 0)} remaining`}
          >
            <span className="numberpad__digit">{n}</span>
            <span className="numberpad__count">{done ? '' : remaining[n]}</span>
          </button>
        );
      })}
    </div>
  );
};
