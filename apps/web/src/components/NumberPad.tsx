import { useMemo } from 'react';
import { useGame, isCellLocked } from '../game/store';
import './NumberPad.css';
import { requestDigit } from '../game/inputActions';
import { useSettings } from '../state/settingsStore';
import { hasCandidate } from '@sudoku/core';
import { haptics } from '../platform/haptics';

export const NumberPad = () => {
  const values = useGame((s) => s.values);
  const solution = useGame((s) => s.solution);
  const given = useGame((s) => s.given);
  const bans = useGame((s) => s.bans);
  const lockedBans = useGame((s) => s.lockedBans);
  const selection = useGame((s) => s.selection);
  const selected = useGame((s) => s.selected);
  const status = useGame((s) => s.status);
  const autoCheck = useGame((s) => s.autoCheck);
  const mode = useGame((s) => s.mode);
  const showRemaining = useSettings((s) => s.showRemaining);

  const checking = autoCheck || mode === 'arcade';

  // When a single fixed cell is selected — a puzzle given, or a correctly-filled
  // (locked) cell — only its own digit stays active; every other key greys out.
  const fixedDigit = useGame((s) => {
    if (s.selection.length > 1 || s.selected == null) return 0;
    const i = s.selected;
    if (s.given[i] || isCellLocked(s, i)) return s.values[i];
    return 0;
  });

  // Bans of the single selected cell. User bans (red, still tappable with a
  // confirm) are kept separate from locked bans (grey + disabled everywhere).
  const single = selection.length <= 1 && selected != null;
  const bannedMask = single ? bans[selected] : 0;
  const lockedMask = single ? lockedBans[selected] : 0;

  // How many of each digit still need placing. While the game is validating, a
  // key only counts as "done" once all nine copies are placed *correctly*, so a
  // wrong entry never greys out the digit you still need; otherwise fall back to
  // a plain by-value count.
  const remaining = useMemo(() => {
    const counts = new Array(10).fill(9);
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v <= 0) continue;
      if (!checking || given[i] || v === solution[i]) counts[v] -= 1;
    }
    return counts;
  }, [values, solution, given, checking]);

  return (
    <div className="numberpad" role="group" aria-label="Number pad">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => {
        const done = remaining[n] <= 0;
        const fixedOut = fixedDigit !== 0 && n !== fixedDigit;
        // Locked: a wrong-entry ban — greyed out and disabled in every mode.
        // Banned: a user ban — red, still tappable (a confirm follows).
        const locked = hasCandidate(lockedMask, n);
        const banned = !locked && hasCandidate(bannedMask, n);
        const cls = locked
          ? ' numberpad__key--locked'
          : banned
            ? ' numberpad__key--banned'
            : '';
        return (
          <button
            key={n}
            type="button"
            className={`numberpad__key${cls}`}
            disabled={done || fixedOut || locked || status !== 'playing'}
            onClick={() => {
              haptics.tap();
              requestDigit(n);
            }}
            aria-label={`Enter ${n}, ${Math.max(remaining[n], 0)} remaining${
              locked ? ' (blocked for the selected cell)' : banned ? ' (banned in the selected cell)' : ''
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
