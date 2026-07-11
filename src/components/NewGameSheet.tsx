import { DIFFICULTIES, type Difficulty } from '../engine/types';
import { useGame } from '../game/store';

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
  const newGame = useGame((s) => s.newGame);
  const mode = useGame((s) => s.mode);
  const current = useGame((s) => s.difficulty);

  if (!open) return null;

  const start = (difficulty: Difficulty) => {
    newGame(difficulty, mode);
    onClose();
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
            >
              <span className="sheet__option-name">{difficulty}</span>
              <span className="sheet__option-desc">{DESCRIPTIONS[difficulty]}</span>
            </button>
          ))}
        </div>
        <button className="sheet__cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};
