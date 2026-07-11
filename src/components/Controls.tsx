import { useGame } from '../game/store';

const UndoIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"
    />
  </svg>
);

const EraseIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      fill="currentColor"
      d="M16.24 3.56 21 8.32a2 2 0 0 1 0 2.83l-8 8H21v2H8.83l-4.39-4.39a2 2 0 0 1 0-2.83l9-9a2 2 0 0 1 2.8 0zM10.83 19l6.36-6.36-4.24-4.24-6.37 6.36L9 19z"
    />
  </svg>
);

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      fill="currentColor"
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"
    />
  </svg>
);

const HintIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      fill="currentColor"
      d="M9 21h6v-1H9zm3-19a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z"
    />
  </svg>
);

const RedoIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"
    />
  </svg>
);

export const Controls = () => {
  const undo = useGame((s) => s.undo);
  const redo = useGame((s) => s.redo);
  const erase = useGame((s) => s.erase);
  const toggleNotesMode = useGame((s) => s.toggleNotesMode);
  const requestHint = useGame((s) => s.requestHint);
  const notesMode = useGame((s) => s.notesMode);
  const canUndo = useGame((s) => s.past.length > 0);
  const canRedo = useGame((s) => s.future.length > 0);
  const won = useGame((s) => s.status === 'won');

  return (
    <div className="controls" role="group" aria-label="Controls">
      <button className="control" onClick={undo} disabled={!canUndo || won}>
        <UndoIcon />
        <span>Undo</span>
      </button>
      <button className="control" onClick={redo} disabled={!canRedo || won}>
        <RedoIcon />
        <span>Redo</span>
      </button>
      <button className="control" onClick={erase} disabled={won}>
        <EraseIcon />
        <span>Erase</span>
      </button>
      <button
        className={`control ${notesMode ? 'control--active' : ''}`}
        onClick={toggleNotesMode}
        disabled={won}
        aria-pressed={notesMode}
      >
        <PencilIcon />
        <span>Notes{notesMode ? ' · On' : ''}</span>
      </button>
      <button className="control" onClick={requestHint} disabled={won}>
        <HintIcon />
        <span>Hint</span>
      </button>
    </div>
  );
};
