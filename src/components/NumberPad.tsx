import { useMemo } from 'react';
import { useGame, isCellLocked } from '../game/store';
import { requestDigit } from '../game/inputActions';
import { useSettings } from '../state/settingsStore';
import { hasCandidate } from '../engine/board';
import { haptics } from '../utils/haptics';

export const NumberPad = () => {
  const values = useGame((s) => s.values);
  const bans = useGame((s) => s.bans);
  const selection = useGame((s) => s.selection);
  const selected = useGame((s) => s.selected);
  const status = useGame((s) => s.status);
  const showRemaining = useSettings((s) => s.showRemaining);

  // When a single, correctly-filled (locked) cell is selected, only its own
  // digit stays active — every other key greys out.
  const lockedDigit = useGame((s) =>
    s.selection.length <= 1 && s.selected != null && isCellLocked(s, s.selected)
      ? s.values[s.selected]
      : 0,
  );
  // Digits the user has banned in the (single) selected cell show up in red.
  const bannedMask = selection.length <= 1 && selected != null ? bans[selected] : 0;

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
        const lockedOut = lockedDigit !== 0 && n !== lockedDigit;
        const banned = hasCandidate(bannedMask, n);
        return (
          <button
            key={n}
            type="button"
            className={`numberpad__key${banned ? ' numberpad__key--banned' : ''}`}
            disabled={done || lockedOut || status !== 'playing'}
            onClick={() => {
              haptics.tap();
              requestDigit(n);
            }}
            aria-label={`Enter ${n}, ${Math.max(remaining[n], 0)} remaining${
              banned ? ' (banned in the selected cell)' : ''
            }`}
          >
            <span className="numberpad__digit">{n}</span>
            {showRemaining && (
              <span className="numberpad__count">{done ? '' : remaining[n]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
