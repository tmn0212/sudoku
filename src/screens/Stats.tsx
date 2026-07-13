import { useEffect, useState } from 'react';
import './Stats.css';
import { ScreenHeader } from '../components/ScreenHeader';
import { getStats, type Stats as StatsData } from '../db/stats';
import { formatTime } from '../utils/format';

const DIFF_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  pro: 'Pro',
  impossible: 'Impossible',
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="stat-card">
    <span className="stat-card__value">{value}</span>
    <span className="stat-card__label">{label}</span>
  </div>
);

/** A tiny inline bar chart of wins per difficulty — no chart library. */
const WinsChart = ({ data }: { data: StatsData['perDifficulty'] }) => {
  const max = Math.max(1, ...data.map((d) => d.games));
  return (
    <div className="stat-chart">
      {data.map((d) => (
        <div key={d.difficulty} className="stat-chart__row">
          <span className="stat-chart__label">{DIFF_LABEL[d.difficulty]}</span>
          <div className="stat-chart__track">
            <div
              className="stat-chart__bar"
              style={{ width: `${(d.games / max) * 100}%` }}
            >
              <div
                className="stat-chart__bar-wins"
                style={{
                  width: d.games ? `${(d.wins / d.games) * 100}%` : '0%',
                }}
              />
            </div>
          </div>
          <span className="stat-chart__count">
            {d.wins}/{d.games}
          </span>
        </div>
      ))}
    </div>
  );
};

export const Stats = () => {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    let alive = true;
    getStats().then((s) => alive && setStats(s));
    return () => {
      alive = false;
    };
  }, []);

  if (!stats) {
    return (
      <div className="screen">
        <ScreenHeader title="Statistics" />
        <div className="screen-loading" role="status">
          <div className="spinner" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (stats.totalGames === 0) {
    return (
      <div className="screen">
        <ScreenHeader title="Statistics" />
        <div className="screen__body">
          <p className="screen__placeholder">
            No games yet. Finish a puzzle and your records, streaks, and fastest
            times will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader title="Statistics" />
      <div className="screen__body">
        <div className="stat-grid">
          <StatCard label="Games won" value={String(stats.wins)} />
          <StatCard
            label="Win rate"
            value={`${Math.round(stats.winRate * 100)}%`}
          />
          <StatCard
            label="Total points"
            value={stats.totalScore.toLocaleString()}
          />
          <StatCard label="Current streak" value={String(stats.currentStreak)} />
          <StatCard label="Best streak" value={String(stats.bestStreak)} />
          <StatCard label="Time played" value={formatTime(stats.totalTimeMs)} />
        </div>

        <section className="stat-section">
          <h2 className="stat-section__title">Games by difficulty</h2>
          <WinsChart data={stats.perDifficulty} />
        </section>

        <section className="stat-section">
          <h2 className="stat-section__title">Best time per difficulty</h2>
          <div className="stat-table">
            {stats.perDifficulty
              .filter((d) => d.wins > 0)
              .map((d) => (
                <div key={d.difficulty} className="stat-table__row">
                  <span className="stat-table__key">
                    {DIFF_LABEL[d.difficulty]}
                  </span>
                  <span className="stat-table__val">
                    {d.bestTimeMs != null ? formatTime(d.bestTimeMs) : '—'}
                    <span className="stat-table__sub">
                      avg {d.avgTimeMs != null ? formatTime(d.avgTimeMs) : '—'}
                    </span>
                  </span>
                </div>
              ))}
          </div>
        </section>

        {stats.topScores.length > 0 && (
          <section className="stat-section">
            <h2 className="stat-section__title">Top scores</h2>
            <ol className="stat-rank">
              {stats.topScores.map((s, i) => (
                <li key={i} className="stat-rank__item">
                  <span className="stat-rank__pos">{i + 1}</span>
                  <span className="stat-rank__main">
                    {s.score.toLocaleString()} pts
                  </span>
                  <span className="stat-rank__meta">
                    <span>{DIFF_LABEL[s.difficulty]}</span>
                    <span>{formatTime(s.timeMs)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {stats.fastest.length > 0 && (
          <section className="stat-section">
            <h2 className="stat-section__title">Fastest solves</h2>
            <ol className="stat-rank">
              {stats.fastest.map((s, i) => (
                <li key={i} className="stat-rank__item">
                  <span className="stat-rank__pos">{i + 1}</span>
                  <span className="stat-rank__main">{formatTime(s.timeMs)}</span>
                  <span className="stat-rank__meta">
                    {DIFF_LABEL[s.difficulty]}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
};
