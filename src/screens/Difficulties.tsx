import { useEffect, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { PACK_SIZES } from '../data/challenges';
import { getChallengeProgress } from '../db/progress';
import { useUi } from '../state/uiStore';
import { DIFFICULTIES, type Difficulty } from '../engine/types';
import type { Mode } from '../db/idb';

const META: Record<Difficulty, { label: string; blurb: string }> = {
  easy: { label: 'Easy', blurb: 'Singles only' },
  medium: { label: 'Medium', blurb: 'Locked candidates, pairs' },
  hard: { label: 'Hard', blurb: 'Triples, X-Wing' },
  pro: { label: 'Pro', blurb: 'Swordfish, XY-Wing' },
  impossible: { label: 'Impossible', blurb: 'Chains & deep logic' },
};

const MODE_LABEL: Record<Mode, string> = { good: 'Good', arcade: 'Arcade' };

export const Difficulties = () => {
  const navigate = useUi((s) => s.navigate);
  const mode = (useUi((s) => s.params.mode) as Mode) ?? 'good';

  // Solved count per difficulty, from IndexedDB only — no puzzle packs are
  // loaded here, keeping this screen's memory footprint tiny.
  const [solved, setSolved] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    Promise.all(
      DIFFICULTIES.map((d) =>
        getChallengeProgress(mode, d).then(
          (m) => [d, [...m.values()].filter((p) => p.solved).length] as const,
        ),
      ),
    ).then((entries) => {
      if (alive) setSolved(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [mode]);

  return (
    <div className="screen">
      <ScreenHeader title={`${MODE_LABEL[mode]} · Difficulty`} />
      <div className="screen__body">
        <div className="difflist">
          {DIFFICULTIES.map((d) => {
            const total = PACK_SIZES[d];
            const done = solved[d] ?? 0;
            const complete = done >= total;
            return (
              <button
                key={d}
                className={`diffcard diffcard--${d}`}
                onClick={() => navigate('challenges', { mode, difficulty: d })}
              >
                <div className="diffcard__main">
                  <span className="diffcard__label">{META[d].label}</span>
                  <span className="diffcard__blurb">{META[d].blurb}</span>
                </div>
                <div className="diffcard__side">
                  <span
                    className={`diffcard__progress ${complete ? 'diffcard__progress--done' : ''}`}
                  >
                    {complete ? '✓ all' : `${done}/${total}`}
                  </span>
                  <span className="diffcard__go" aria-hidden="true">▶</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
