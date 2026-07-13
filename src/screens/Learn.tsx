import { useEffect, useState } from 'react';
import './Learn.css';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconCheck, IconChevronRight, IconGrid } from '../components/icons';
import { LESSONS, TIERS } from '../data/lessons';
import { getLearned } from '../db/learned';
import { useUi } from '../state/uiStore';

export const Learn = () => {
  const navigate = useUi((s) => s.navigate);
  const [learned, setLearned] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    getLearned().then((s) => alive && setLearned(s));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="screen">
      <ScreenHeader title="Learn" />
      <div className="screen__body">
        <p className="learn-intro">
          Interactive lessons for the techniques the solver uses. Read the idea,
          study a real deduction on the board, then practise a puzzle that needs
          the move.
        </p>

        <button
          className="learn-howto"
          onClick={() => navigate('tutorial')}
        >
          <span className="learn-howto__icon" aria-hidden="true">
            <IconGrid size={22} />
          </span>
          <span className="learn-howto__text">
            <span className="learn-howto__title">How to Play</span>
            <span className="learn-howto__sub">
              The board, the tools, highlighting and modes
            </span>
          </span>
          <IconChevronRight size={20} />
        </button>

        {TIERS.map((tier) => {
          const lessons = LESSONS.filter((l) => l.tier === tier);
          if (lessons.length === 0) return null;
          return (
            <section key={tier} className="learn-section">
              <h2 className="learn-section__title">{tier}</h2>
              <div className="learn-list">
                {lessons.map((l) => (
                  <button
                    key={l.id}
                    className="learn-item"
                    onClick={() => navigate('lesson', { id: l.id })}
                  >
                    <span className="learn-item__text">
                      <span className="learn-item__title">{l.title}</span>
                      <span className="learn-item__summary">{l.summary}</span>
                    </span>
                    {learned.has(l.id) ? (
                      <span
                        className="learn-item__badge learn-item__badge--done"
                        aria-label="Learned"
                      >
                        <IconCheck size={16} />
                      </span>
                    ) : (
                      <span className="learn-item__badge" aria-hidden="true">
                        <IconChevronRight size={18} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
