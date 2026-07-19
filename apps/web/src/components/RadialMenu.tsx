import type { ReactNode } from 'react';
import type { RadialAction, RadialState } from './radial';
import { radialLayout } from './radial';
import { IconPencil, IconNotes, IconNotesAlt, IconBan, IconDeselect } from './icons';
import './RadialMenu.css';

interface Meta {
  label: string;
  icon: ReactNode;
  /** A subtractive action, styled apart from the four mode picks. */
  danger?: boolean;
}

const META: Record<RadialAction, Meta> = {
  normal: { label: 'Digit', icon: <IconPencil size={22} /> },
  note: { label: 'Notes', icon: <IconNotes size={22} /> },
  noteAlt: { label: 'Notes 2', icon: <IconNotesAlt size={22} /> },
  ban: { label: 'Ban', icon: <IconBan size={22} /> },
  deselect: { label: 'Deselect', icon: <IconDeselect size={22} />, danger: true },
};

/** How far each option sits from the hub (px). */
const RADIUS = 62;

/** Presentational radial mode picker. Pointer handling lives in the Board, which
 *  drives `state.active`; this layer just draws (positions come from the shared
 *  `radialLayout`, so icons and pointer sectors always line up) and ignores
 *  pointer events. */
export const RadialMenu = ({ state }: { state: RadialState }) => (
  <div className="radial" style={{ left: state.x, top: state.y }} aria-hidden="true">
    <span className="radial__hub" />
    {radialLayout(state.deselect).map(({ action, angle }) => {
      const meta = META[action];
      const rad = (angle * Math.PI) / 180;
      const dx = Math.cos(rad) * RADIUS;
      const dy = Math.sin(rad) * RADIUS;
      const active = state.active === action;
      const transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)${
        active ? ' scale(1.16)' : ''
      }`;
      return (
        <span
          key={action}
          className={`radial__opt${meta.danger ? ' radial__opt--danger' : ''}${
            active ? ' radial__opt--active' : ''
          }`}
          style={{ transform }}
        >
          {meta.icon}
          <span className="radial__label">{meta.label}</span>
        </span>
      );
    })}
  </div>
);
