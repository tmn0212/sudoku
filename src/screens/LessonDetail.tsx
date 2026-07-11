import { useEffect, useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { LessonBoard } from '../components/LessonBoard';
import { lessonById } from '../data/lessons';
import { parseGrid } from '../engine/board';
import { solve } from '../engine/solver';
import { findStep } from '../engine/techniques';
import { gradeDifficulty } from '../engine/generator';
import { getLearned, markLearned, unmarkLearned } from '../db/learned';
import { useGame } from '../game/store';
import { useUi } from '../state/uiStore';

export const LessonDetail = () => {
  const id = useUi((s) => s.params.id) as string | undefined;
  const navigate = useUi((s) => s.navigate);
  const back = useUi((s) => s.back);
  const lesson = id ? lessonById(id) : undefined;

  const [revealed, setRevealed] = useState(false);
  const [isLearned, setIsLearned] = useState(false);

  useEffect(() => {
    setRevealed(false);
    if (!lesson) return;
    let alive = true;
    getLearned().then((s) => alive && setIsLearned(s.has(lesson.id)));
    return () => {
      alive = false;
    };
  }, [lesson]);

  const example = useMemo(() => {
    if (!lesson?.example) return null;
    const grid = parseGrid(lesson.example.values);
    const candidateMasks = lesson.example.candidates;
    const step = findStep(grid, candidateMasks);
    return { grid, candidateMasks, step };
  }, [lesson]);

  if (!lesson) {
    return (
      <div className="screen">
        <ScreenHeader title="Lesson" />
        <div className="screen__body">
          <p className="screen__placeholder">Lesson not found.</p>
        </div>
      </div>
    );
  }

  const toggleLearned = async () => {
    if (isLearned) {
      await unmarkLearned(lesson.id);
      setIsLearned(false);
    } else {
      await markLearned(lesson.id);
      setIsLearned(true);
    }
  };

  const practice = () => {
    if (!lesson.practice) return;
    const puzzle = parseGrid(lesson.practice);
    const solution = solve(puzzle);
    if (!solution) return;
    useGame.getState().startGame(
      {
        puzzle,
        solution,
        difficulty: gradeDifficulty(puzzle),
        givens: puzzle.reduce((n, v) => (v !== 0 ? n + 1 : n), 0),
      },
      'good',
    );
    navigate('game');
  };

  return (
    <div className="screen">
      <ScreenHeader title={lesson.title} />
      <div className="screen__body">
        <span className={`lesson-tier lesson-tier--${lesson.tier.toLowerCase()}`}>
          {lesson.tier}
        </span>

        <div className="lesson-prose">
          {lesson.steps.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {example && (
          <>
            <h2 className="lesson-heading">See it on the board</h2>
            <LessonBoard
              grid={example.grid}
              candidateMasks={example.candidateMasks}
              highlights={example.step?.highlights ?? []}
              placements={example.step?.placements ?? []}
              eliminations={example.step?.eliminations ?? []}
              revealed={revealed}
            />

            {example.step && (
              <div className={`lesson-reveal ${revealed ? 'lesson-reveal--open' : ''}`}>
                {revealed ? (
                  <p className="lesson-reveal__text">{example.step.reason}</p>
                ) : (
                  <button
                    className="lesson-reveal__button"
                    onClick={() => setRevealed(true)}
                  >
                    Reveal the move
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <div className="lesson-actions">
          {lesson.practice && (
            <button className="lesson-actions__practice" onClick={practice}>
              Practice this technique
            </button>
          )}
          <button
            className={`lesson-actions__learn ${isLearned ? 'lesson-actions__learn--done' : ''}`}
            onClick={toggleLearned}
          >
            {isLearned ? '✓ Learned' : 'Mark as learned'}
          </button>
        </div>

        <button className="lesson-back" onClick={back}>
          Back to lessons
        </button>
      </div>
    </div>
  );
};
