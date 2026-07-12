import { useGame, ARCADE_LIVES } from '../game/store';
import { IconHeart } from './icons';

/**
 * A slim strip under the header showing arcade lives (or good-mode mistakes).
 * Kept out of the top bar so a long difficulty like "Impossible" can't push the
 * hearts off the edge. Renders nothing when there's nothing to show.
 */
export const StatusBar = () => {
  const mode = useGame((s) => s.mode);
  const mistakes = useGame((s) => s.mistakes);
  const autoCheck = useGame((s) => s.autoCheck);
  const livesLeft = Math.max(0, ARCADE_LIVES - mistakes);

  if (mode === 'arcade') {
    return (
      <div className="statusbar">
        <span className="statusbar__lives" aria-label={`${livesLeft} lives left`}>
          {Array.from({ length: ARCADE_LIVES }, (_, i) => (
            <IconHeart key={i} size={20} filled={i < livesLeft} />
          ))}
        </span>
      </div>
    );
  }

  if (autoCheck && mistakes > 0) {
    return (
      <div className="statusbar">
        <span className="statusbar__mistakes">
          {mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}
        </span>
      </div>
    );
  }

  return null;
};
