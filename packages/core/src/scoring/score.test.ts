import { describe, it, expect } from 'vitest';
import {
  computeScore,
  liveScore,
  mistakePenalty,
  RATING,
  scoreBreakdown,
  TARGET_TIME,
} from './score';
import type { ScoreInput } from './score';

const base: ScoreInput = {
  difficulty: 'medium',
  mode: 'relaxed',
  timeMs: TARGET_TIME.medium * 1000,
  mistakes: 0,
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
    expect(computeScore({ ...base, mistakes: 20, timeMs: 3_600_000 })).toBe(0);
  });
});

describe('scoreBreakdown', () => {
  it('.total equals computeScore for every input', () => {
    const cases: ScoreInput[] = [
      base,
      { ...base, mode: 'arcade' },
      { ...base, mode: 'arcade', mistakes: 2 },
      { ...base, difficulty: 'impossible', timeMs: 30_000 },
      { ...base, won: false },
      { ...base, mistakes: 20, timeMs: 3_600_000 },
    ];
    for (const c of cases) {
      expect(scoreBreakdown(c).total).toBe(computeScore(c));
    }
  });

  it('parts sum to the total and are non-negative magnitudes', () => {
    const b = scoreBreakdown({ ...base, mode: 'arcade', mistakes: 2 });
    expect(b.base).toBe(RATING.medium);
    expect(b.mistakePenalty).toBe(mistakePenalty(2));
    expect(b.flawlessBonus).toBe(0); // mistakes were made
    expect(b.total).toBe(b.base + b.timeBonus + b.flawlessBonus - b.mistakePenalty);
  });

  it('awards the flawless bonus only to a clean arcade solve', () => {
    expect(scoreBreakdown({ ...base, mode: 'arcade' }).flawlessBonus).toBeGreaterThan(0);
    expect(scoreBreakdown({ ...base, mode: 'arcade', mistakes: 1 }).flawlessBonus).toBe(0);
    expect(scoreBreakdown({ ...base, mode: 'relaxed' }).flawlessBonus).toBe(0);
  });
});

describe('liveScore', () => {
  const live = {
    difficulty: 'medium' as const,
    filled: 0,
    fillable: 40,
    mistakes: 0,
  };

  it('is zero on a fresh board and climbs with progress', () => {
    expect(liveScore(live)).toBe(0);
    const half = liveScore({ ...live, filled: 20 });
    const full = liveScore({ ...live, filled: 40 });
    expect(half).toBeGreaterThan(0);
    expect(full).toBeGreaterThan(half);
  });

  it('at full progress equals the final score minus its time and flawless bonuses', () => {
    const full = liveScore({ ...live, filled: 40, mistakes: 2 });
    const b = scoreBreakdown({
      difficulty: 'medium',
      mode: 'arcade',
      timeMs: 123_000,
      mistakes: 2,
      won: true,
    });
    expect(full).toBe(b.base - b.mistakePenalty);
  });

  it('never goes negative and treats an empty puzzle as zero', () => {
    expect(liveScore({ ...live, filled: 1, mistakes: 20 })).toBe(0);
    expect(liveScore({ ...live, fillable: 0 })).toBe(0);
  });
});
