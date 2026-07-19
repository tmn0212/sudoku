import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  /** The target value to display. Changing it tweens from the current display. */
  value: number;
  /** Tween length in ms (0 snaps instantly). */
  duration?: number;
  className?: string;
  /** Render the (rounded) number as a string; defaults to a grouped integer. */
  format?: (n: number) => string;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// easeOutCubic — a lively start that settles gently onto the final value.
const ease = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * A number that counts up/down to `value` with a requestAnimationFrame tween.
 * Re-targeting mid-flight is smooth (it eases from whatever is on screen, not
 * from the previous target). Honours reduced-motion by snapping. Used by the
 * live Arcade score readout and the win screen's total.
 */
export const AnimatedNumber = ({
  value,
  duration = 500,
  className,
  format,
}: AnimatedNumberProps) => {
  const [display, setDisplay] = useState(value);
  // The live displayed value, mirrored in a ref so a new tween can start from it
  // without waiting for a re-render.
  const displayRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayRef.current;
    if (from === value) return;

    if (duration <= 0 || prefersReducedMotion()) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }

    let startTs: number | null = null;
    const step = (ts: number) => {
      if (startTs === null) startTs = ts;
      const p = Math.min(1, (ts - startTs) / duration);
      const next = Math.round(from + (value - from) * ease(p));
      displayRef.current = next;
      setDisplay(next);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const rounded = Math.round(display);
  return <span className={className}>{format ? format(rounded) : rounded.toLocaleString()}</span>;
};
