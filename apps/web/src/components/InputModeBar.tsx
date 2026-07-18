import type { ReactNode } from 'react';
import { useGame, type InputMode } from '../game/store';
import { IconPencil, IconNotes, IconNotesAlt, IconBan } from './icons';
import './InputModeBar.css';

const MODES: { id: InputMode; label: string; icon: ReactNode }[] = [
  { id: 'normal', label: 'Digit', icon: <IconPencil size={20} /> },
  { id: 'note', label: 'Notes', icon: <IconNotes size={20} /> },
  { id: 'noteAlt', label: 'Notes 2', icon: <IconNotesAlt size={20} /> },
  { id: 'ban', label: 'Ban', icon: <IconBan size={20} /> },
];

export const InputModeBar = () => {
  // `inputMode` is what a digit does right now (a gesture can override it); the
  // committed tool is the durable choice a transient tool snaps back to. The two
  // differ only while a transient gesture tool is live.
  const inputMode = useGame((s) => s.inputMode);
  const committedMode = useGame((s) => s.committedMode);
  const setInputMode = useGame((s) => s.setInputMode);

  return (
    <div className="mode-bar" role="group" aria-label="Input mode">
      {MODES.map((m) => {
        const active = inputMode === m.id;
        const committed = committedMode === m.id;
        return (
          <button
            key={m.id}
            data-mode={m.id}
            className={`mode-bar__btn${active ? ' mode-bar__btn--active' : ''}${
              committed ? ' mode-bar__btn--committed' : ''
            }`}
            onClick={() => setInputMode(m.id)}
            aria-pressed={committed}
            aria-label={
              active && !committed
                ? `${m.label} (active until next entry)`
                : committed && !active
                  ? `${m.label} (selected tool)`
                  : m.label
            }
          >
            <span className="mode-bar__icon" aria-hidden="true">
              {m.icon}
            </span>
            <span className="mode-bar__label">{m.label}</span>
            {committed && !active && (
              <span className="mode-bar__pin" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
};
