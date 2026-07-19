import { describe, it, expect } from 'vitest';
import { computeScore, mistakePenalty, RATING, TARGET_TIME } from './score';
import type { ScoreInput } from './score';

const base: ScoreInput = {
  difficulty: 'medium',
  mode: 'relaxed',
  timeMs: TARGET_TIME.medium * 1000,
  mistakes: 0,
  hints: 0,
  won: true,
};

describe('mistakePenalty', () => {
  it('escalates: -30, then +10 each', () => {
    expect(mistakePenalty(0)).toBe(0);
    expect(mistakePenalty(1)).toBe(30);
    expect(mistakePenalty(2)).toBe(70);
    expect(mistakePenalty(3)).toBe(120);
  });
});

describe('computeScore', () => {
  it('is zero for an unfinished game', () => {
    expect(computeScore({ ...base, won: false })).toBe(0);
  });

  it('at target time, time bonus equals the rating', () => {
    // clamp(target/target,0,3) = 1 → timeBonus = rating → total ~ 2*rating
    expect(computeScore(base)).toBe(RATING.medium * 2);
  });

  it('rewards faster solves', () => {
    const fast = computeScore({ ...base, timeMs: (TARGET_TIME.medium / 2) * 1000 });
    expect(fast).toBeGreaterThan(computeScore(base));
  });

  it('penalizes mistakes', () => {
    expect(computeScore({ ...base, mistakes: 3 })).toBeLessThan(computeScore(base));
  });

  it('penalizes hints in arcade but leaves them free in relaxed', () => {
    expect(computeScore({ ...base, mode: 'arcade', hints: 2 })).toBeLessThan(
      computeScore({ ...base, mode: 'arcade' }),
    );
    // Relaxed hints are a free learning aid — score is unchanged by them.
    expect(computeScore({ ...base, hints: 2 })).toBe(computeScore(base));
  });

  it('harder difficulties score higher at equivalent pace', () => {
    const easy = computeScore({ ...base, difficulty: 'easy', timeMs: TARGET_TIME.easy * 1000 });
    const pro = computeScore({ ...base, difficulty: 'pro', timeMs: TARGET_TIME.pro * 1000 });
    expect(pro).toBeGreaterThan(easy);
  });

  it('gives arcade a flawless bonus for zero mistakes', () => {
    const relaxed = computeScore({ ...base, mode: 'relaxed' });
    const arcade = computeScore({ ...base, mode: 'arcade' });
    expect(arcade).toBeGreaterThan(relaxed);
  });

  it('never goes negative', () => {
    expect(
      computeScore({ ...base, mistakes: 20, hints: 20, timeMs: 3_600_000 }),
    ).toBe(0);
  });
});
