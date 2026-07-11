import { useState } from 'react';
import { DIFFICULTIES, type Difficulty } from '../engine/types';
import { useGame } from '../game/store';
import { generatePuzzleAsync } from '../workers/client';

interface NewGameSheetProps {
  open: boolean;
  onClose: () => void;
}

const DESCRIPTIONS: Record<Difficulty, string> = {
  easy: 'Singles only — a gentle warm-up.',
  medium: 'Locked candidates and pairs.',
  hard: 'Triples and X-Wing.',
  pro: 'Swordfish and XY-Wing.',
  impossible: 'Chains and deep logic.',
};

export const NewGameSheet = ({ open, onClose }: NewGameSheetProps) => {
  const mode = useGame((s) => s.mode);
  const current = useGame((s) => s.difficulty);
  const [busy, setBusy] = useState<Difficulty | null>(null);

  if (!open) return null;

  // Generate off the main thread so slow tiers (pro/impossible) never freeze
  // the UI while the sheet is open.
  const start = async (difficulty: Difficulty) => {
    if (busy) return;
    setBusy(difficulty);
    try {
      const puzzle = await generatePuzzleAsync(difficulty);
      useGame.getState().startGame(puzzle, mode);
      onClose();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="New game"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <h2 className="sheet__title">New Game</h2>
        <div className="sheet__options">
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty}
              className={`sheet__option ${difficulty === current ? 'sheet__option--current' : ''}`}
              onClick={() => start(difficulty)}
              disabled={busy !== null}
            >
              <span className="sheet__option-name">{difficulty}</span>
              <span className="sheet__option-desc">
                {busy === difficulty ? 'Generating…' : DESCRIPTIONS[difficulty]}
              </span>
            </button>
          ))}
        </div>
        <button className="sheet__cancel" onClick={onClose} disabled={busy !== null}>
          Cancel
        </button>
      </div>
    </div>
  );
};
