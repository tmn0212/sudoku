import { useGame, type InputMode } from '../game/store';

const MODES: { id: InputMode; label: string; dotClass?: string; icon: string }[] = [
  { id: 'normal', label: 'Digit', icon: '✎' },
  { id: 'note', label: 'Notes', dotClass: 'dot--blue', icon: '✎' },
  { id: 'noteAlt', label: 'Notes', dotClass: 'dot--grey', icon: '✎' },
  { id: 'ban', label: 'Ban', dotClass: 'dot--red', icon: '✕' },
];

export const InputModeBar = () => {
  const inputMode = useGame((s) => s.inputMode);
  const setInputMode = useGame((s) => s.setInputMode);

  return (
    <div className="mode-bar" role="group" aria-label="Input mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`mode-bar__btn ${inputMode === m.id ? 'mode-bar__btn--active' : ''}`}
          onClick={() => setInputMode(m.id)}
          aria-pressed={inputMode === m.id}
        >
          {m.dotClass ? (
            <span className={`dot ${m.dotClass}`} aria-hidden="true" />
          ) : (
            <span className="mode-bar__icon" aria-hidden="true">
              {m.icon}
            </span>
          )}
          <span className="mode-bar__label">{m.label}</span>
        </button>
      ))}
    </div>
  );
};
