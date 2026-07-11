import type { ReactNode } from 'react';
import { useUi } from '../state/uiStore';

const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
    />
  </svg>
);

interface ScreenHeaderProps {
  title: string;
  /** Right-side action (e.g. a settings gear). */
  action?: ReactNode;
}

export const ScreenHeader = ({ title, action }: ScreenHeaderProps) => {
  const back = useUi((s) => s.back);
  return (
    <header className="screen-header">
      <button className="screen-header__back" onClick={back} aria-label="Back">
        <BackIcon />
      </button>
      <h1 className="screen-header__title">{title}</h1>
      <div className="screen-header__action">{action}</div>
    </header>
  );
};
