import { useMemo } from 'react';
import { useGame, isCellLocked } from '../game/store';
import { requestDigit } from '../game/inputActions';
import { useSettings } from '../state/settingsStore';
import { hasCandidate } from '../engine/board';
import { haptics } from '../utils/haptics';

export const NumberPad = () => {
  const values = useGame((s) => s.values);
  const solution = useGame((s) => s.solution);
  const given = useGame((s) => s.given);
  const bans = useGame((s) => s.bans);
  const selection = useGame((s) => s.selection);
  const selected = useGame((s) => s.selected);
  const status = useGame((s) => s.status);
  const autoCheck = useGame((s) => s.autoCheck);
  const mode = useGame((s) => s.mode);
  const inputMode = useGame((s) => s.inputMode);
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

  // Digits the user has banned in the (single) selected cell show up in red.
  const bannedMask = selection.length <= 1 && selected != null ? bans[selected] : 0;

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
        const banned = hasCandidate(bannedMask, n);
        // A banned digit greys out so the same wrong entry can't be repeated —
        // except in Ban mode, where tapping it is how you lift the ban.
        const bannedOut = banned && inputMode !== 'ban';
        return (
          <button
            key={n}
            type="button"
            className={`numberpad__key${banned ? ' numberpad__key--banned' : ''}`}
            disabled={done || fixedOut || bannedOut || status !== 'playing'}
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
