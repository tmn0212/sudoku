import { useMemo } from 'react';
import { useGame, isCellLocked, resolvedPeerDigits } from '../game/store';
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

  // Bans of the single selected cell. User bans (red, still tappable with a
  // confirm) are kept separate from locked bans (grey + disabled everywhere).
  const single = selection.length <= 1 && selected != null;
  const bannedMask = single ? bans[selected] : 0;
  const lockedMask = single ? lockedBans[selected] : 0;

  // Digits a peer already resolves (a given, or a validated correct entry): they
  // can never go in the selected cell, so the pad greys them out — the hard-rule
  // complement of sweeping a digit from peers' marks when it's placed correctly.
  const resolvedMask = useGame((s) =>
    s.selection.length <= 1 && s.selected != null
      ? resolvedPeerDigits(s, s.selected)
      : 0,
  );

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
        // Resolved: a peer already holds this digit correctly. That's a hard block
        // only for *placing* it (Digit mode); in note/ban modes the key stays live
        // — a note taps to bounce back out, a ban records your own "not here" mark.
        // Locked: a wrong-entry ban — greyed out and disabled in every mode.
        // Banned: a user ban — red, still tappable (a confirm follows).
        const resolvedBlocks = hasCandidate(resolvedMask, n) && inputMode === 'normal';
        const lockedBan = hasCandidate(lockedMask, n);
        const blocked = resolvedBlocks || lockedBan;
        const banned = !blocked && hasCandidate(bannedMask, n);
        const cls = blocked
          ? ' numberpad__key--locked'
          : banned
            ? ' numberpad__key--banned'
            : '';
        return (
          <button
            key={n}
            type="button"
            className={`numberpad__key${cls}`}
            disabled={done || fixedOut || blocked || status !== 'playing'}
            onClick={() => {
              haptics.tap();
              requestDigit(n);
            }}
            aria-label={`Enter ${n}, ${Math.max(remaining[n], 0)} remaining${
              resolvedBlocks
                ? ' (already placed in this row, column, or box)'
                : lockedBan
                  ? ' (blocked for the selected cell)'
                  : banned
                    ? ' (banned in the selected cell)'
                    : ''
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
