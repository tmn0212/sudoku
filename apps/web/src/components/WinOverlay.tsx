import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import './WinOverlay.css';
import { scoreBreakdown } from '@sudoku/core';
import { useGame } from '../game/store';
import { useSettings } from '../state/settingsStore';
import { formatTime } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { IconBolt, IconCheck, IconHeartBroken, IconTrophy } from './icons';

interface WinOverlayProps {
  onNext: () => void;
  onRetry: () => void;
  onHome: () => void;
  busy?: boolean;
}

// Hold the win card back long enough for the full-board celebration wave to play
// (see useCompletionFx); kept just past the flash's own lifetime in fxStore.
const CELEBRATE_MS = 850;
// Beat between the card landing (on its live-continuous subtotal) and the bonuses
// counting on, so the "your time earned you this" moment reads clearly.
const TALLY_DELAY_MS = 420;

interface BreakRow {
  key: string;
  label: string;
  amount: number;
  icon: ReactNode;
  kind: 'add' | 'sub' | 'bonus';
}

const signed = (n: number): string =>
  `${n >= 0 ? '+' : '-'}${Math.abs(n).toLocaleString()}`;

export const WinOverlay = ({ onNext, onRetry, onHome, busy }: WinOverlayProps) => {
  const status = useGame((s) => s.status);
  const elapsedMs = useGame((s) => s.elapsedMs);
  const mistakes = useGame((s) => s.mistakes);
  const difficulty = useGame((s) => s.difficulty);
  const mode = useGame((s) => s.mode);
  const celebrate = useSettings((s) => s.celebrateCompletions);

  const won = status === 'won';
  const breakdown = useMemo(
    () => scoreBreakdown({ difficulty, mode, timeMs: elapsedMs, mistakes, won }),
    [difficulty, mode, elapsedMs, mistakes, won],
  );

  // Where the running counter starts: the base minus the mistake penalty —
  // exactly the number the live HUD was showing at the moment of the solve. The
  // bonuses (time + flawless) then count on from here.
  const subtotal = Math.max(0, breakdown.base - breakdown.mistakePenalty);

  const rows: BreakRow[] = [];
  rows.push({
    key: 'base',
    label: 'Puzzle solved',
    amount: breakdown.base,
    icon: <IconCheck size={17} />,
    kind: 'add',
  });
  if (breakdown.mistakePenalty > 0) {
    rows.push({
      key: 'mistakes',
      label: `Mistakes (${mistakes})`,
      amount: -breakdown.mistakePenalty,
      icon: <IconHeartBroken size={17} />,
      kind: 'sub',
    });
  }
  if (breakdown.timeBonus > 0) {
    rows.push({
      key: 'time',
      label: 'Speed bonus',
      amount: breakdown.timeBonus,
      icon: <IconBolt size={17} />,
      kind: 'bonus',
    });
  }
  if (breakdown.flawlessBonus > 0) {
    rows.push({
      key: 'flawless',
      label: 'Flawless',
      amount: breakdown.flawlessBonus,
      icon: <IconTrophy size={17} />,
      kind: 'bonus',
    });
  }

  // Reveal immediately on a loss (or when celebrations are off); on a win, wait
  // for the board wave to finish so the modal doesn't cover the fun part.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (status === 'playing') {
      setRevealed(false);
      return;
    }
    if (status === 'won' && celebrate) {
      const t = setTimeout(() => setRevealed(true), CELEBRATE_MS);
      return () => clearTimeout(t);
    }
    setRevealed(true);
  }, [status, celebrate]);

  // The counter lands on the subtotal, then a beat later climbs through the
  // bonuses to the final total.
  const [countTo, setCountTo] = useState(subtotal);
  useEffect(() => {
    if (!revealed || !won) return;
    setCountTo(subtotal);
    const t = setTimeout(() => setCountTo(breakdown.total), TALLY_DELAY_MS);
    return () => clearTimeout(t);
  }, [revealed, won, subtotal, breakdown.total]);

  if (status === 'playing' || !revealed) return null;

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={won ? 'Puzzle solved' : 'Game over'}
    >
      <div className="overlay__card">
        <div
          className={`overlay__icon overlay__icon--${won ? 'win' : 'lose'}`}
          aria-hidden="true"
        >
          {won ? <IconTrophy size={52} /> : <IconHeartBroken size={52} />}
        </div>
        <h2 className="overlay__title">{won ? 'Solved!' : 'Out of lives'}</h2>

        {won ? (
          <>
            <div className="overlay__score">
              <AnimatedNumber
                value={countTo}
                duration={900}
                className="overlay__score-value"
              />
              <span className="overlay__score-label">points</span>
            </div>
            <p className="overlay__subtitle">
              Solved in {formatTime(elapsedMs)}
              <span className="overlay__dot" aria-hidden="true" />
              <span style={{ textTransform: 'capitalize' }}>{difficulty}</span>
            </p>
            <dl className="overlay__break">
              {rows.map((r, i) => (
                <div
                  key={r.key}
                  className={`overlay__break-row overlay__break-row--${r.kind}`}
                  style={{ '--i': i } as CSSProperties}
                >
                  <dt>
                    <span className="overlay__break-icon" aria-hidden="true">
                      {r.icon}
                    </span>
                    {r.label}
                  </dt>
                  <dd>{signed(r.amount)}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <dl className="overlay__stats">
            <div>
              <dt>Time</dt>
              <dd>{formatTime(elapsedMs)}</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd style={{ textTransform: 'capitalize' }}>{difficulty}</dd>
            </div>
            <div>
              <dt>Mistakes</dt>
              <dd>{mistakes}</dd>
            </div>
          </dl>
        )}

        <div className="overlay__actions">
          {won ? (
            <button className="overlay__button" onClick={onNext} disabled={busy}>
              {busy ? 'Loading…' : 'Next Puzzle'}
            </button>
          ) : (
            <button className="overlay__button" onClick={onRetry} disabled={busy}>
              Try Again
            </button>
          )}
          <button
            className="overlay__button overlay__button--ghost"
            onClick={onHome}
            disabled={busy}
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
};
