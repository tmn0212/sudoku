import { ScreenHeader } from '../components/ScreenHeader';
import './Settings.css';
import { useSettings } from '../state/settingsStore';
import { useGame } from '../game/store';
import { THEMES, FONTS } from '@sudoku/ui-tokens';
import { AnimationPicker } from '../components/AnimationPicker';

interface ToggleRowProps {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: () => void;
}

const ToggleRow = ({ label, desc, checked, onChange }: ToggleRowProps) => (
  <button
    className="setting-row"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
  >
    <span className="setting-row__text">
      <span className="setting-row__label">{label}</span>
      {desc && <span className="setting-row__desc">{desc}</span>}
    </span>
    <span className={`switch ${checked ? 'switch--on' : ''}`} aria-hidden="true">
      <span className="switch__knob" />
    </span>
  </button>
);

export const Settings = () => {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const font = useSettings((s) => s.font);
  const setFont = useSettings((s) => s.setFont);
  const highlightPeers = useSettings((s) => s.highlightPeers);
  const highlightSame = useSettings((s) => s.highlightSame);
  const highlightNotes = useSettings((s) => s.highlightNotes);
  const highlightCrosshatch = useSettings((s) => s.highlightCrosshatch);
  const autoCleanupNotes = useSettings((s) => s.autoCleanupNotes);
  const warnOnBanned = useSettings((s) => s.warnOnBanned);
  const showRemaining = useSettings((s) => s.showRemaining);
  const celebrateCompletions = useSettings((s) => s.celebrateCompletions);
  const sound = useSettings((s) => s.sound);
  const music = useSettings((s) => s.music);
  const autoRevertMode = useSettings((s) => s.autoRevertMode);
  const toggle = useSettings((s) => s.toggle);

  const autoCheck = useGame((s) => s.autoCheck);
  const setAutoCheck = useGame((s) => s.setAutoCheck);

  return (
    <div className="screen">
      <ScreenHeader title="Settings" />
      <div className="screen__body">
        <section className="settings-section">
          <h2 className="settings-section__title">Theme</h2>
          <div className="theme-grid">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-swatch ${theme === t.id ? 'theme-swatch--active' : ''}`}
                onClick={() => setTheme(t.id)}
                aria-pressed={theme === t.id}
              >
                <span
                  className="theme-swatch__preview"
                  style={{ background: t.swatch[0] }}
                >
                  <span
                    className="theme-swatch__dot"
                    style={{ background: t.swatch[1] }}
                  />
                </span>
                <span className="theme-swatch__label">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">Typeface</h2>
          <div className="font-grid">
            {FONTS.map((f) => (
              <button
                key={f.id}
                className={`font-option ${font === f.id ? 'font-option--active' : ''}`}
                onClick={() => setFont(f.id)}
                aria-pressed={font === f.id}
              >
                <span
                  className="font-option__preview"
                  style={{ fontFamily: f.stack }}
                  aria-hidden="true"
                >
                  123
                </span>
                <span className="font-option__label">{f.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">Animation</h2>
          <AnimationPicker />
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">Sound</h2>
          <ToggleRow
            label="Sound effects"
            desc="Play tones when you place digits, complete units, win, or slip up"
            checked={sound}
            onChange={() => toggle('sound')}
          />
          <ToggleRow
            label="Background music"
            desc="Loop a calm soundtrack while you play"
            checked={music}
            onChange={() => toggle('music')}
          />
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">Assists</h2>
          <ToggleRow
            label="Check mistakes"
            desc="Flag entries that don't match the solution"
            checked={autoCheck}
            onChange={() => setAutoCheck(!autoCheck)}
          />
          <ToggleRow
            label="Highlight peers"
            desc="Shade the row, column, and box of the selected cell"
            checked={highlightPeers}
            onChange={() => toggle('highlightPeers')}
          />
          <ToggleRow
            label="Highlight same number"
            desc="Highlight every cell with the selected digit"
            checked={highlightSame}
            onChange={() => toggle('highlightSame')}
          />
          <ToggleRow
            label="Highlight matching notes"
            desc="Highlight the selected digit inside other cells' pencil marks"
            checked={highlightNotes}
            onChange={() => toggle('highlightNotes')}
          />
          <ToggleRow
            label="Crossroad scan"
            desc="Shade the rows and columns through every copy of the selected digit"
            checked={highlightCrosshatch}
            onChange={() => toggle('highlightCrosshatch')}
          />
          <ToggleRow
            label="Warn on banned digit"
            desc="Confirm before placing a digit you've banned in that cell"
            checked={warnOnBanned}
            onChange={() => toggle('warnOnBanned')}
          />
          <ToggleRow
            label="Auto-revert tool"
            desc="A drag, double-tap, or hold picks a tool for the next entry only, then snaps back to your selected tool"
            checked={autoRevertMode}
            onChange={() => toggle('autoRevertMode')}
          />
          <ToggleRow
            label="Auto-clean notes"
            desc="Remove a digit from peers' notes when you place it"
            checked={autoCleanupNotes}
            onChange={() => toggle('autoCleanupNotes')}
          />
          <ToggleRow
            label="Show remaining counts"
            desc="Show how many of each digit are left on the number pad"
            checked={showRemaining}
            onChange={() => toggle('showRemaining')}
          />
          <ToggleRow
            label="Completion celebrations"
            desc="Flash a green wave when you finish a row, column, box, or digit"
            checked={celebrateCompletions}
            onChange={() => toggle('celebrateCompletions')}
          />
        </section>
      </div>
    </div>
  );
};
