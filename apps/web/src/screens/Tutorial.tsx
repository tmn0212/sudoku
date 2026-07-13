import { useState, type ReactNode } from 'react';
import './Tutorial.css';
import '../styles/walkthrough.css';
import { ScreenHeader } from '../components/ScreenHeader';
import { LessonBoard } from '../components/LessonBoard';
import {
  IconPencil,
  IconNotes,
  IconBan,
  IconUndo,
  IconRedo,
  IconEraser,
  IconHint,
  IconGrid,
  IconBolt,
  IconHeart,
  IconChevronLeft,
  IconChevronRight,
} from '../components/icons';
import { parseGrid, PEERS } from '../engine/board';
import { useUi } from '../state/uiStore';

// The classic sample grid — recognisable and valid, purely for illustration.
const DEMO = parseGrid(
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
);
const CENTER = 40; // r4c4, an empty cell used to demo selection + peers

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** A single enlarged cell used to show what each input mode produces. */
const MiniCell = ({
  value,
  valueClass,
  notes,
  banned,
}: {
  value?: number;
  valueClass?: string;
  notes?: { n: number; color: string }[];
  banned?: number[];
}): ReactNode => (
  <div className="tut-mini">
    {value != null ? (
      <span className={`tut-mini__value ${valueClass ?? ''}`}>{value}</span>
    ) : (
      <div className="tut-mini__notes">
        {digits.map((n) => {
          const mark = notes?.find((x) => x.n === n);
          const isBan = banned?.includes(n);
          return (
            <span
              key={n}
              className={`tut-mini__note ${isBan ? 'tut-mini__note--ban' : ''}`}
              style={mark ? { color: mark.color } : undefined}
            >
              {mark || isBan ? n : ''}
            </span>
          );
        })}
      </div>
    )}
  </div>
);

const MODE_ROWS = [
  {
    icon: <IconPencil size={18} />,
    label: 'Digit',
    color: 'var(--primary)',
    desc: 'Places the final answer in the selected cell.',
    cell: <MiniCell value={7} valueClass="tut-mini__value--digit" />,
  },
  {
    icon: <IconNotes size={18} />,
    label: 'Notes',
    color: 'var(--note-primary)',
    desc: 'Pencil in the candidates you are still considering.',
    cell: (
      <MiniCell
        notes={[1, 2, 4, 7].map((n) => ({ n, color: 'var(--note-primary)' }))}
      />
    ),
  },
  {
    icon: <IconNotes size={18} />,
    label: 'Notes 2',
    color: 'var(--note-alt)',
    desc: 'A second set of marks in grey, to track a different idea.',
    cell: (
      <MiniCell
        notes={[3, 5, 8].map((n) => ({ n, color: 'var(--note-alt)' }))}
      />
    ),
  },
  {
    icon: <IconBan size={18} />,
    label: 'Ban',
    color: 'var(--ban)',
    desc: 'Cross off digits that cannot go in a cell.',
    cell: (
      <MiniCell
        notes={[2, 7].map((n) => ({ n, color: 'var(--muted)' }))}
        banned={[3, 9]}
      />
    ),
  },
];

const CONTROL_ROWS = [
  { icon: <IconUndo size={20} />, label: 'Undo', desc: 'Step back a move.' },
  { icon: <IconRedo size={20} />, label: 'Redo', desc: 'Step forward again.' },
  { icon: <IconEraser size={20} />, label: 'Erase', desc: 'Clear the selected cell.' },
  {
    icon: <IconHint size={20} />,
    label: 'Hint',
    desc: 'Flags a mistake, or shows the next logical step.',
  },
];

const GAME_MODE_ROWS = [
  {
    icon: <IconGrid size={22} />,
    label: 'Good',
    desc: 'Untimed and relaxed. Mistakes are flagged but never end the game.',
    extra: null as ReactNode,
  },
  {
    icon: <IconBolt size={22} />,
    label: 'Arcade',
    desc: 'Race the clock with only three lives, and a wrong entry costs one.',
    extra: (
      <span className="tut-lives">
        <IconHeart size={16} />
        <IconHeart size={16} />
        <IconHeart size={16} />
      </span>
    ),
  },
];

interface Step {
  title: string;
  body: string;
  visual: ReactNode;
}

const STEPS: Step[] = [
  {
    title: 'The goal',
    body: 'Fill every empty cell so that each row, each column, and each 3×3 box contains the digits 1 to 9 exactly once.',
    visual: <LessonBoard grid={DEMO} />,
  },
  {
    title: 'Select & highlight',
    body: 'Tap a cell to select it. Its row, column and box are shaded so you can see exactly which cells it shares digits with. Drag to select several cells at once.',
    visual: <LessonBoard grid={DEMO} highlights={[CENTER]} peers={[...PEERS[CENTER]]} />,
  },
  {
    title: 'Matching numbers',
    body: 'When you select a filled cell, every other cell holding that same digit lights up too, which helps you spot where a number can still go.',
    visual: <LessonBoard grid={DEMO} highlights={[0]} peers={[14, 71]} />,
  },
  {
    title: 'Four input modes',
    body: 'The buttons on the left choose what a number tap does. Each has its own colour so you always know the current mode.',
    visual: (
      <div className="tut-modes">
        {MODE_ROWS.map((m) => (
          <div key={m.label} className="tut-mode">
            <span className="tut-chip" style={{ color: m.color }}>
              {m.icon}
              <span className="tut-chip__label">{m.label}</span>
            </span>
            {m.cell}
            <span className="tut-mode__desc">{m.desc}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'The controls',
    body: 'Along the bottom you can undo and redo, erase a cell, or ask for a hint when you get stuck.',
    visual: (
      <div className="tut-controls">
        {CONTROL_ROWS.map((c) => (
          <div key={c.label} className="tut-control">
            <span className="tut-control__icon">{c.icon}</span>
            <span className="tut-control__label">{c.label}</span>
            <span className="tut-control__desc">{c.desc}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Good vs Arcade',
    body: 'Pick a play style from the home screen. Both use the same puzzles, but Arcade adds pressure.',
    visual: (
      <div className="tut-gamemodes">
        {GAME_MODE_ROWS.map((g) => (
          <div key={g.label} className="tut-gamemode">
            <span className="tut-gamemode__icon">{g.icon}</span>
            <span className="tut-gamemode__body">
              <span className="tut-gamemode__label">
                {g.label}
                {g.extra}
              </span>
              <span className="tut-gamemode__desc">{g.desc}</span>
            </span>
          </div>
        ))}
      </div>
    ),
  },
];

export const Tutorial = () => {
  const navigate = useUi((s) => s.navigate);
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const atStart = i === 0;
  const atEnd = i === STEPS.length - 1;

  return (
    <div className="screen">
      <ScreenHeader title="How to Play" />
      <div className="screen__body">
        <div className="tut-visual">{step.visual}</div>

        <div className="walk__caption">
          <span className="walk__step">
            {step.title} ({i + 1} of {STEPS.length})
          </span>
          <p className="walk__reason">{step.body}</p>
        </div>
      </div>

      <div className="screen__footer">
        <div className="walk__nav walk__nav--two">
          <button
            className="walk__btn"
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={atStart}
          >
            <IconChevronLeft size={18} />
            Back
          </button>
          {atEnd ? (
            <button
              className="walk__btn walk__btn--next"
              onClick={() => navigate('difficulties', { mode: 'good' })}
            >
              Start playing
            </button>
          ) : (
            <button
              className="walk__btn walk__btn--next"
              onClick={() => setI((n) => Math.min(STEPS.length - 1, n + 1))}
            >
              Next
              <IconChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
