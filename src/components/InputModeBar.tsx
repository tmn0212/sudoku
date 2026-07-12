import type { ReactNode } from 'react';
import { useGame, type InputMode } from '../game/store';
import { IconPencil, IconNotes, IconNotesAlt, IconBan } from './icons';

const MODES: { id: InputMode; label: string; icon: ReactNode }[] = [
  { id: 'normal', label: 'Digit', icon: <IconPencil size={20} /> },
  { id: 'note', label: 'Notes', icon: <IconNotes size={20} /> },
  { id: 'noteAlt', label: 'Notes 2', icon: <IconNotesAlt size={20} /> },
  { id: 'ban', label: 'Ban', icon: <IconBan size={20} /> },
];

export const InputModeBar = () => {
  const inputMode = useGame((s) => s.inputMode);
  const setInputMode = useGame((s) => s.setInputMode);

  return (
    <div className="mode-bar" role="group" aria-label="Input mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          data-mode={m.id}
          className={`mode-bar__btn ${inputMode === m.id ? 'mode-bar__btn--active' : ''}`}
          onClick={() => setInputMode(m.id)}
          aria-pressed={inputMode === m.id}
        >
          <span className="mode-bar__icon" aria-hidden="true">
            {m.icon}
          </span>
          <span className="mode-bar__label">{m.label}</span>
        </button>
      ))}
    </div>
  );
};
