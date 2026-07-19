import { useEffect, useState, type CSSProperties } from 'react';
import { ANIM_STYLES } from '@sudoku/ui-tokens';
import { useSettings } from '../state/settingsStore';
import './AnimationPicker.css';

/**
 * A live-looping preview cell + a list of animation styles. The preview reuses
 * the real `.cell` classes so it plays whatever the *active* style is (the CSS is
 * `:root[data-anim=…]`-scoped), alternating the placement (`cell--pop`) and
 * completion (`cell--flash`) effects so both are visible. Tapping a style applies
 * it immediately, so the preview instantly re-plays in the new style.
 */
const AnimationPreview = () => {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => x + 1), 1050);
    return () => clearInterval(t);
  }, []);
  // Even ticks demo a placement pop-in; odd ticks demo a completion flash.
  const phase = n % 2 === 0 ? 'cell--pop' : 'cell--flash';
  return (
    <div className="anim-preview" aria-hidden="true">
      <div
        key={n}
        className={`cell ${phase}`}
        style={{ '--flash-delay': '0ms' } as CSSProperties}
      >
        <span className="cell__value">5</span>
      </div>
    </div>
  );
};

export const AnimationPicker = () => {
  const animStyle = useSettings((s) => s.animStyle);
  const setAnimStyle = useSettings((s) => s.setAnimStyle);
  return (
    <div className="anim-picker">
      <AnimationPreview />
      <div className="anim-list">
        {ANIM_STYLES.map((a) => (
          <button
            key={a.id}
            className={`anim-option ${animStyle === a.id ? 'anim-option--active' : ''}`}
            onClick={() => setAnimStyle(a.id)}
            aria-pressed={animStyle === a.id}
          >
            <span className="anim-option__text">
              <span className="anim-option__label">{a.label}</span>
              <span className="anim-option__blurb">{a.blurb}</span>
            </span>
            <span className="anim-option__check" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
};
