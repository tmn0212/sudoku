import { useEffect, useMemo, useState } from 'react';
import './LessonDetail.css';
import '../styles/walkthrough.css';
import { ScreenHeader } from '../components/ScreenHeader';
import { LessonBoard } from '../components/LessonBoard';
import { IconCheck, IconChevronLeft, IconChevronRight } from '../components/icons';
import { lessonById } from '../data/lessons';
import { parseGrid } from '../engine/board';
import { solve } from '../engine/solver';
import {
  applyStepToState,
  findStep,
  runTechnique,
} from '../engine/techniques';
import { gradeDifficulty } from '../engine/generator';
import { getLearned, markLearned, unmarkLearned } from '../db/learned';
import { useGame } from '../game/store';
import { useUi } from '../state/uiStore';
import type { Grid, Step } from '../engine/types';

interface Frame {
  grid: Grid;
  candidates: number[];
  step: Step | null;
}

/** Build a step-by-step walkthrough from a lesson's example state: the taught
 * technique first, then a few follow-up deductions so the puzzle visibly
 * progresses. */
const buildFrames = (values: string, candidates: number[], id: string): Frame[] => {
  const grid = parseGrid(values);
  const cand = candidates.slice();
  const frames: Frame[] = [];

  const taught = runTechnique(id as Step['technique'], grid, cand);
  if (taught) {
    frames.push({ grid: grid.slice(), candidates: cand.slice(), step: taught });
    applyStepToState(grid, cand, taught);
  }
  for (let k = 0; k < 6; k++) {
    const step = findStep(grid, cand);
    if (!step) break;
    frames.push({ grid: grid.slice(), candidates: cand.slice(), step });
    applyStepToState(grid, cand, step);
  }
  frames.push({ grid: grid.slice(), candidates: cand.slice(), step: null });
  return frames;
};

export const LessonDetail = () => {
  const id = useUi((s) => s.params.id) as string | undefined;
  const navigate = useUi((s) => s.navigate);
  const lesson = id ? lessonById(id) : undefined;

  const [i, setI] = useState(0);
  const [isLearned, setIsLearned] = useState(false);

  const frames = useMemo<Frame[]>(
    () =>
      lesson?.example
        ? buildFrames(lesson.example.values, lesson.example.candidates, lesson.id)
        : [],
    [lesson],
  );

  useEffect(() => {
    setI(0);
    if (!lesson) return;
    let alive = true;
    getLearned().then((s) => alive && setIsLearned(s.has(lesson.id)));
    return () => {
      alive = false;
    };
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

  const frame = frames[i];
  const moves = frames.length - 1; // last frame is the "done" state
  const atStart = i === 0;
  const atEnd = i >= frames.length - 1;

  return (
    <div className="screen">
      <ScreenHeader title={lesson.title} />
      <div className="screen__body">
        <p className="walk__summary">{lesson.summary}</p>

        {frame && (
          <LessonBoard
            grid={frame.grid}
            candidateMasks={frame.candidates}
            highlights={frame.step?.highlights ?? []}
            placements={frame.step?.placements ?? []}
            eliminations={frame.step?.eliminations ?? []}
            revealed
          />
        )}

        <div className="walk__caption">
          {frame?.step ? (
            <>
              <span className="walk__step">
                {i === 0 ? lesson.title : 'Then'} (step {i + 1} of {moves})
              </span>
              <p className="walk__reason">{frame.step.reason}</p>
            </>
          ) : (
            <p className="walk__reason walk__reason--done">
              That’s the move. The puzzle opens up from here, so try it yourself
              below.
            </p>
          )}
        </div>
      </div>

      <div className="screen__footer">
        <div className="walk__nav">
          <button
            className="walk__btn"
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={atStart}
          >
            <IconChevronLeft size={18} />
            Back
          </button>
          <button
            className="walk__btn walk__btn--ghost"
            onClick={() => setI(0)}
            disabled={atStart}
          >
            Restart
          </button>
          <button
            className="walk__btn walk__btn--next"
            onClick={() => setI((n) => Math.min(frames.length - 1, n + 1))}
            disabled={atEnd}
          >
            Next
            <IconChevronRight size={18} />
          </button>
        </div>

        <div className="lesson-actions">
          {lesson.practice && (
            <button className="lesson-actions__practice" onClick={practice}>
              Play a puzzle with this move
            </button>
          )}
          <button
            className={`lesson-actions__learn ${isLearned ? 'lesson-actions__learn--done' : ''}`}
            onClick={toggleLearned}
          >
            {isLearned ? (
              <>
                <IconCheck size={17} />
                Learned
              </>
            ) : (
              'Mark as learned'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
