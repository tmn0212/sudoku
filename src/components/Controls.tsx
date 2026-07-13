import { useGame } from '../game/store';
import { IconUndo, IconRedo, IconEraser, IconHint } from './icons';
import './Controls.css';

export const Controls = () => {
  const undo = useGame((s) => s.undo);
  const redo = useGame((s) => s.redo);
  const erase = useGame((s) => s.erase);
  const requestHint = useGame((s) => s.requestHint);
  const canUndo = useGame((s) => s.past.length > 0);
  const canRedo = useGame((s) => s.future.length > 0);
  const won = useGame((s) => s.status === 'won');

  return (
    <div className="controls" role="group" aria-label="Controls">
      <button className="control" onClick={undo} disabled={!canUndo || won}>
        <IconUndo size={22} />
        <span>Undo</span>
      </button>
      <button className="control" onClick={redo} disabled={!canRedo || won}>
        <IconRedo size={22} />
        <span>Redo</span>
      </button>
      <button className="control" onClick={erase} disabled={won}>
        <IconEraser size={22} />
        <span>Erase</span>
      </button>
      <button className="control" onClick={requestHint} disabled={won}>
        <IconHint size={22} />
        <span>Hint</span>
      </button>
    </div>
  );
};
