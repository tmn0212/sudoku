import { type ChangeEvent } from 'react';
import './Slider.css';

interface SliderProps {
  label: string;
  /** 0–1. */
  value: number;
  /** Fires continuously as the user drags (live value). */
  onChange: (v: number) => void;
  /** Fires once when the drag ends — good for playing a level preview. */
  onRelease?: (v: number) => void;
}

/** A labelled 0–1 volume slider (styled range input). */
export const Slider = ({ label, value, onChange, onRelease }: SliderProps) => {
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value) / 100);
  return (
    <label className="slider">
      <span className="slider__label">{label}</span>
      <input
        className="slider__input"
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={handle}
        onPointerUp={() => onRelease?.(value)}
        onKeyUp={() => onRelease?.(value)}
        aria-label={label}
      />
      <span className="slider__value">{Math.round(value * 100)}</span>
    </label>
  );
};
