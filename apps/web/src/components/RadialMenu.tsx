import type { ReactNode } from 'react';
import type { RadialAction, RadialState } from './radial';
import { IconPencil, IconNotes, IconNotesAlt, IconBan, IconDeselect } from './icons';
import './RadialMenu.css';

type Pos = 'up' | 'right' | 'down' | 'left' | 'downLeft';

interface Option {
  action: RadialAction;
  label: string;
  icon: ReactNode;
  pos: Pos;
  /** A subtractive action, styled apart from the four mode picks. */
  danger?: boolean;
}

const MODES: Option[] = [
  { action: 'normal', label: 'Digit', icon: <IconPencil size={22} />, pos: 'up' },
  { action: 'note', label: 'Notes', icon: <IconNotes size={22} />, pos: 'right' },
  { action: 'noteAlt', label: 'Notes 2', icon: <IconNotesAlt size={22} />, pos: 'down' },
  { action: 'ban', label: 'Ban', icon: <IconBan size={22} />, pos: 'left' },
];

// Only offered when the held cell is part of a multi-selection.
const DESELECT: Option = {
  action: 'deselect',
  label: 'Deselect',
  icon: <IconDeselect size={22} />,
  pos: 'downLeft',
  danger: true,
};

const RADIUS = 60;
const DIAG = RADIUS * Math.SQRT1_2;
const OFFSET: Record<Pos, [number, number]> = {
  up: [0, -RADIUS],
  right: [RADIUS, 0],
  down: [0, RADIUS],
  left: [-RADIUS, 0],
  downLeft: [-DIAG, DIAG],
};

/** Presentational radial mode picker. Pointer handling lives in the Board, which
 *  drives `state.active`; this layer just draws and ignores pointer events. */
export const RadialMenu = ({ state }: { state: RadialState }) => {
  const options = state.deselect ? [...MODES, DESELECT] : MODES;
  return (
    <div className="radial" style={{ left: state.x, top: state.y }} aria-hidden="true">
      <span className="radial__hub" />
      {options.map((o) => {
        const [dx, dy] = OFFSET[o.pos];
        const active = state.active === o.action;
        const transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)${
          active ? ' scale(1.16)' : ''
        }`;
        return (
          <span
            key={o.action}
            className={`radial__opt${o.danger ? ' radial__opt--danger' : ''}${
              active ? ' radial__opt--active' : ''
            }`}
            style={{ transform }}
          >
            {o.icon}
            <span className="radial__label">{o.label}</span>
          </span>
        );
      })}
    </div>
  );
};
