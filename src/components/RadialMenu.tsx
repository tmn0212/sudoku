import type { ReactNode } from 'react';
import type { InputMode } from '../game/store';
import type { RadialState } from './radial';
import { IconPencil, IconNotes, IconNotesAlt, IconBan } from './icons';
import './RadialMenu.css';

type Pos = 'up' | 'right' | 'down' | 'left';

const OPTIONS: { mode: InputMode; label: string; icon: ReactNode; pos: Pos }[] = [
  { mode: 'normal', label: 'Digit', icon: <IconPencil size={22} />, pos: 'up' },
  { mode: 'note', label: 'Notes', icon: <IconNotes size={22} />, pos: 'right' },
  { mode: 'noteAlt', label: 'Notes 2', icon: <IconNotesAlt size={22} />, pos: 'down' },
  { mode: 'ban', label: 'Ban', icon: <IconBan size={22} />, pos: 'left' },
];

const RADIUS = 60;
const OFFSET: Record<Pos, [number, number]> = {
  up: [0, -RADIUS],
  right: [RADIUS, 0],
  down: [0, RADIUS],
  left: [-RADIUS, 0],
};

/** Presentational radial mode picker. Pointer handling lives in the Board, which
 *  drives `state.active`; this layer just draws and ignores pointer events. */
export const RadialMenu = ({ state }: { state: RadialState }) => (
  <div className="radial" style={{ left: state.x, top: state.y }} aria-hidden="true">
    <span className="radial__hub" />
    {OPTIONS.map((o) => {
      const [dx, dy] = OFFSET[o.pos];
      const active = state.active === o.mode;
      const transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)${
        active ? ' scale(1.16)' : ''
      }`;
      return (
        <span
          key={o.mode}
          className={`radial__opt${active ? ' radial__opt--active' : ''}`}
          style={{ transform }}
        >
          {o.icon}
          <span className="radial__label">{o.label}</span>
        </span>
      );
    })}
  </div>
);
