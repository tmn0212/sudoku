/**
 * Tiny inline-SVG icon set. Dependency-free and themeable: every icon draws in
 * `currentColor`, so colour comes from the surrounding element. Kept in one
 * module so screens share the same visual language (replaces scattered emoji).
 */
import { useId, type SVGProps } from 'react';

type IconProps = { size?: number } & SVGProps<SVGSVGElement>;

const svg = (size: number, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
  ...rest,
});

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const IconHome = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

export const IconChevronRight = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path {...stroke} d="M9 6l6 6-6 6" />
  </svg>
);

export const IconChevronLeft = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path {...stroke} d="M15 6l-6 6 6 6" />
  </svg>
);

export const IconCheck = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path {...stroke} strokeWidth={2.4} d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconPlus = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path {...stroke} d="M12 5v14M5 12h14" />
  </svg>
);

export const IconClock = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <circle cx="12" cy="12" r="9" {...stroke} />
    <path {...stroke} d="M12 8v4l3 2" />
  </svg>
);

/** Hamburger — opens the in-game "more options" menu. */
export const IconMenu = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path {...stroke} d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

/** Circular arrow — restart the puzzle from scratch. */
export const IconRefresh = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path {...stroke} d="M3 12a9 9 0 1 0 2.6-6.4" />
    <path {...stroke} d="M3 4v5h5" />
  </svg>
);

/** Pen: places a final digit (the "ink" tool). */
export const IconPencil = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path
      fill="currentColor"
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
    />
  </svg>
);

/** A cell pencilled with candidate marks — the primary "notes" tool. */
export const IconNotes = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" {...stroke} strokeWidth={1.6} />
    {[7.7, 12, 16.3].map((y) =>
      [7.7, 12, 16.3].map((x) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.15" fill="currentColor" />
      )),
    )}
  </svg>
);

/** A second, independent set of pencil candidates — the "notes 2" tool. */
export const IconNotesAlt = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" {...stroke} strokeWidth={1.6} />
    {[9, 13].map((y) =>
      [9, 13].map((x) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.05" fill="currentColor" />
      )),
    )}
    <text
      x="16.4"
      y="19.2"
      textAnchor="middle"
      fontSize="8"
      fontWeight="800"
      fill="currentColor"
    >
      2
    </text>
  </svg>
);

/** No-entry sign: this digit cannot go here (the "ban" tool). */
export const IconBan = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path
      fill="currentColor"
      d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.94 7.94 0 0 1 4 12c0-4.42 3.58-8 8-8zm0 16a7.94 7.94 0 0 1-4.9-1.69L18.31 7.1A7.94 7.94 0 0 1 20 12c0 4.42-3.58 8-8 8z"
    />
  </svg>
);

/** A cell crossed out — remove it from the multi-selection (radial "Deselect"). */
export const IconDeselect = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" {...stroke} strokeWidth={1.6} />
    <path {...stroke} strokeWidth={1.8} d="M9 9l6 6M15 9l-6 6" />
  </svg>
);

/** Sudoku grid — marks the untimed "Relaxed" mode. */
export const IconGrid = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <rect x="3" y="3" width="18" height="18" rx="3" {...stroke} />
    <path {...stroke} strokeWidth={1.6} d="M9 3v18M15 3v18M3 9h18M3 15h18" />
  </svg>
);

/** Lightning — marks the timed "Arcade" mode. */
export const IconBolt = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path fill="currentColor" d="M13 2L3 14h6l-1 8 10-12h-6l1-8z" />
  </svg>
);

export const IconDice = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <rect x="3" y="3" width="18" height="18" rx="4" {...stroke} />
    {[
      [8, 8],
      [16, 8],
      [12, 12],
      [8, 16],
      [16, 16],
    ].map(([cx, cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="currentColor" />
    ))}
  </svg>
);

export const IconTrophy = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path
      fill="currentColor"
      d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"
    />
  </svg>
);

const HEART_D =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

/**
 * A pie wedge covering `frac` of a full turn, centred on the heart and swept
 * clockwise from the top. Used to clip the heart fill so a partial heart empties
 * radially (like a clock hand) rather than in a flat vertical slice. Radius 18
 * comfortably covers the whole 24×24 glyph.
 */
const heartWedge = (frac: number): string => {
  const cx = 12;
  const cy = 12;
  const r = 18;
  const theta = frac * 2 * Math.PI;
  const x = cx + r * Math.sin(theta);
  const y = cy - r * Math.cos(theta);
  const largeArc = frac > 0.5 ? 1 : 0;
  return `M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${largeArc} 1 ${x.toFixed(3)} ${y.toFixed(3)} Z`;
};

/**
 * Heart pip. `fraction` (0..1) draws a partial heart that empties as a radial
 * wedge, for the quarter-life a hint costs in Arcade; `filled` is the boolean
 * shorthand. Empty and partial hearts keep their outline so the shape reads.
 */
export const IconHeart = ({
  size = 24,
  filled = true,
  fraction,
  ...rest
}: IconProps & { filled?: boolean; fraction?: number }) => {
  const frac = Math.max(0, Math.min(1, fraction ?? (filled ? 1 : 0)));
  const clipId = useId();
  const clipped = frac > 0 && frac < 1;
  return (
    <svg {...svg(size, rest)}>
      {frac < 1 && <path d={HEART_D} fill="none" stroke="currentColor" strokeWidth={2} />}
      {frac > 0 && (
        <>
          {clipped && (
            <clipPath id={clipId}>
              <path d={heartWedge(frac)} />
            </clipPath>
          )}
          <path
            d={HEART_D}
            fill="currentColor"
            clipPath={clipped ? `url(#${clipId})` : undefined}
          />
        </>
      )}
    </svg>
  );
};

export const IconUndo = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path fill="currentColor" d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />
  </svg>
);

export const IconRedo = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path fill="currentColor" d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z" />
  </svg>
);

export const IconEraser = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path
      fill="currentColor"
      d="M16.24 3.56 21 8.32a2 2 0 0 1 0 2.83l-8 8H21v2H8.83l-4.39-4.39a2 2 0 0 1 0-2.83l9-9a2 2 0 0 1 2.8 0zM10.83 19l6.36-6.36-4.24-4.24-6.37 6.36L9 19z"
    />
  </svg>
);

export const IconHint = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path
      fill="currentColor"
      d="M9 21h6v-1H9zm3-19a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z"
    />
  </svg>
);

export const IconHeartBroken = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="currentColor"
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35zM12.9 6l-2.4 4.4h2.3L11 15.5l4.2-6.2h-2.5L14.4 6z"
    />
  </svg>
);

/** Symmetric 8-tooth cog (Material-style) for Settings. */
export const IconSettings = ({ size = 24, ...rest }: IconProps) => (
  <svg {...svg(size, rest)}>
    <path
      fill="currentColor"
      d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
    />
  </svg>
);
